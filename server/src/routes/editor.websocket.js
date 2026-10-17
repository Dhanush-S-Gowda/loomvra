import { WebSocketServer, WebSocket } from "ws";
import { chatCompletion } from "../services/openrouter.js";
import { searchImages } from "../services/pexels.js";
import { getProject, getSettings, getSlidesByProject, updateSlide, getOrCreateAgentSession, updateAgentSessionContextLimit, getAgentMessages, addAgentMessage, updateAgentUsage, resetAgentSession } from "../storage/db.js";
import { processSlide, renderSlide, assertRenderedSlide } from "../pipeline/index.js";

const EDITOR_SYSTEM = `You are an agentic presentation editor. Explain your plan briefly, inspect the supplied slides, and use tools for every change. Never return JSON edit plans.

EDIT TOOL RULES:
- Call edit exactly once per tool call, with one slide and one target.
- Every edit argument is required: slideNumber, target, oldCode, newCode, reason.
- oldCode must be copied byte-for-byte from the supplied slide CSS/HTML, including whitespace and punctuation. Never invent it, abbreviate it, or leave it blank.
- newCode must be the smallest replacement needed. Do not regenerate a whole slide or return an empty object.
- If you cannot identify an exact oldCode match, do not call edit; explain what is missing.

IMAGE TOOL RULES:
- search_image returns textual metadata, including usable image URLs. It does not return image bytes or visual understanding.
- If the user asks for an image, call search_image first, then use one returned URL exactly in a later edit call as an HTML image src or CSS background URL.
- Do not claim to have visually inspected the image; describe it only using the returned alt text and photographer metadata.

After tools finish, clearly summarize what changed. Preserve the slide master and unrelated code. Only make safe, validated edits.`;
const TOOLS = [
  { type: "function", function: { name: "edit", description: "Apply one minimal exact replacement to a slide.", parameters: { type: "object", additionalProperties: false, properties: { slideNumber: { type: "integer" }, target: { type: "string", enum: ["html", "css"] }, oldCode: { type: "string" }, newCode: { type: "string" }, reason: { type: "string" } }, required: ["slideNumber", "target", "oldCode", "newCode", "reason"] } } },
  { type: "function", function: { name: "search_image", description: "Search Pexels for images for the presentation.", parameters: { type: "object", additionalProperties: false, properties: { query: { type: "string" }, orientation: { type: "string", enum: ["landscape", "portrait", "square"] }, count: { type: "integer", minimum: 1, maximum: 8 } }, required: ["query"] } } },
];

function send(socket, type, payload = {}) { if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type, ...payload })); }
function toolArgs(call) {
  const raw = call.function?.arguments;
  if (typeof raw !== "string" || !raw.trim()) throw new Error(`The ${call.function?.name || "tool"} call had empty arguments.`);
  let parsed;
  try { parsed = JSON.parse(raw); } catch { throw new Error(`The ${call.function?.name || "tool"} call returned malformed JSON arguments.`); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Tool arguments must be a JSON object.");
  return parsed;
}
function slideContext(projectId) { return getSlidesByProject(projectId).map((row) => ({ slideNumber: row.seq_num, content: JSON.parse(row.html_content || "{}") })); }

async function applyEdit(projectId, args) {
  const number = Number(args.slideNumber);
  const target = args.target === "css" ? "css" : args.target === "html" ? "html" : null;
  if (!Number.isInteger(number) || !target || typeof args.oldCode !== "string" || !args.oldCode || typeof args.newCode !== "string") throw new Error("Invalid edit arguments.");
  const row = getSlidesByProject(projectId).find((item) => item.seq_num === number);
  if (!row) throw new Error(`Slide ${number} not found.`);
  const current = processSlide(JSON.parse(row.html_content || "{}"));
  const index = current[target].indexOf(args.oldCode);
  if (index < 0 || current[target].indexOf(args.oldCode, index + 1) >= 0) throw new Error("The exact oldCode was not found uniquely; inspect the slide and try again.");
  const updated = { ...current, [target]: current[target].slice(0, index) + args.newCode + current[target].slice(index + args.oldCode.length) };
  const validated = processSlide(updated);
  try {
    await assertRenderedSlide(validated, number);
  } catch (error) {
    throw new Error(`Edit validation failed for slide ${number}: ${error.message}`);
  }
  updateSlide(projectId, number, { html_content: JSON.stringify(validated) });
  return { slideNumber: number, target, oldCode: args.oldCode, newCode: args.newCode, content: renderSlide(validated, number), reason: args.reason };
}

export function attachEditorWebSocket(server) {
  const wss = new WebSocketServer({ noServer: true });
  server.on("upgrade", (request, socket, head) => {
    const match = new URL(request.url, "http://localhost").pathname.match(/^\/ws\/project\/([^/]+)$/);
    if (!match) return;
    wss.handleUpgrade(request, socket, head, (client) => { client.projectId = match[1]; wss.emit("connection", client); });
  });
  wss.on("connection", (socket) => {
    const projectId = String(socket.projectId).replace(/^proj-/, "");
    const project = getProject(projectId);
    if (!project) { send(socket, "error", { error: "Project not found" }); socket.close(1008); return; }
    const configuredContextLimit = Number(getSettings().main_model_context_limit) || 32768;
    const session = updateAgentSessionContextLimit(
      projectId,
      configuredContextLimit,
    );
    send(socket, "ready", { projectId: Number(projectId), sessionId: session.id, context: { promptTokens: session.prompt_tokens, completionTokens: session.completion_tokens, contextLimit: session.context_limit } });
    socket.on("message", async (raw) => {
      try {
        const message = JSON.parse(raw.toString());
        if (message.type === "stop") {
          if (socket.activeRun) socket.activeRun.cancelled = true;
          send(socket, "stopped", { message: "Generation stopped." });
          return;
        }
        if (message.type === "reset") {
          if (socket.activeRun) socket.activeRun.cancelled = true;
          const session = resetAgentSession(projectId);
          send(socket, "session_reset", { context: { promptTokens: session.prompt_tokens, completionTokens: session.completion_tokens, contextLimit: session.context_limit } });
          return;
        }
        if (message.type !== "edit" || typeof message.prompt !== "string" || !message.prompt.trim()) { send(socket, "error", { error: "A non-empty prompt is required." }); return; }
        const settings = getSettings();
        if (!settings.openrouter_api || !settings.main_model) { send(socket, "error", { error: "OpenRouter and main_model must be configured in settings." }); return; }
        const chatInstructionSections = [
          ["Design planning", settings.design_custom_prompt],
          ["Slide generation", settings.slides_custom_prompt],
          ["AI chat edits", settings.chat_custom_prompt],
        ]
          .filter(([, instructions]) => instructions?.trim())
          .map(([label, instructions]) => `### ${label}\n${instructions.trim()}`);
        const editorSystemPrompt = chatInstructionSections.length
          ? `${EDITOR_SYSTEM}\n\n[ADDITIONAL USER INSTRUCTIONS]\n${chatInstructionSections.join("\n\n")}`
          : EDITOR_SYSTEM;
        const images = Array.isArray(message.images) ? message.images : [];
        const userContent = JSON.stringify({
          prompt: message.prompt,
          selectedSlides: message.slideNumbers || [],
          // Avoid storing inline image bytes in the conversation database.
          images: images.map(({ purpose, url }) => ({ purpose, ...(url?.startsWith("data:") ? {} : { url }) })),
        });
        const currentUserMessage = addAgentMessage(projectId, "user", userContent, { slideNumbers: message.slideNumbers || [] });
        // Tool messages are intentionally not replayed across requests. Older
        // sessions may contain orphaned tool outputs, and providers reject a
        // tool result unless its assistant tool call is in the same request.
        // The current turn still sends assistant toolCalls followed immediately
        // by their matching tool results below.
        const stored = getAgentMessages(projectId).filter((item) => {
          if (item.role === "user") return true;
          if (item.role !== "assistant") return false;
          try { return !JSON.parse(item.metadata_json || "{}").toolCalls?.length; } catch { return true; }
        }).slice(-40).map((item) => {
          const metadata = JSON.parse(item.metadata_json || "{}");
          const toolCalls = (metadata.toolCalls || []).map((call) => ({ id: call.id, type: "function", function: { name: call.function?.name || "", arguments: call.function?.arguments || "{}" } }));
          if (item.role === "user") {
            let parsed;
            try { parsed = JSON.parse(item.content); } catch { parsed = null; }
            if (parsed && typeof parsed.prompt === "string") {
              const userImages = item.id === currentUserMessage.id ? images : (parsed.images || []);
              const content = [
                { type: "text", text: `${parsed.prompt}${parsed.selectedSlides?.length ? `\nSelected slides: ${parsed.selectedSlides.join(", ")}` : ""}` },
                ...userImages
                  .map((image) => image?.url || image?.src)
                  .filter((url) => typeof url === "string" && url)
                  // @openrouter/sdk uses camelCase input models and maps this
                  // field to the wire-level `image_url` property itself.
                  .map((url) => ({ type: "image_url", imageUrl: { url } })),
              ];
              return { role: item.role, content };
            }
          }
          return { role: item.role, content: item.content, ...(toolCalls.length ? { toolCalls } : {}) };
        });
        const responseMessages = [{ role: "system", content: `${editorSystemPrompt}\nProject: ${project.name}\nCurrent slides:\n${JSON.stringify(slideContext(projectId))}` }, ...stored];
        const changes = [];
        const run = { cancelled: false };
        socket.activeRun = run;
        for (let turn = 0; turn < 8; turn += 1) {
          if (run.cancelled) break;
          send(socket, "status", { stage: "thinking", message: turn ? "Continuing the edit…" : "Thinking through the request…" });
          const response = await chatCompletion({ apiKey: settings.openrouter_api, model: settings.main_model, systemPrompt: editorSystemPrompt, userPrompt: "", options: { messages: responseMessages, tools: TOOLS, toolChoice: "auto", reasoning: { effort: "medium" }, timeoutMs: 180000, onChunk: (chunk) => { if (chunk.type === "reasoning") send(socket, "reasoning_delta", { delta: chunk.delta }); else if (chunk.delta) send(socket, "text_delta", { delta: chunk.delta }); else if (chunk.type === "tool_call") send(socket, "tool_call_delta", { toolCall: chunk.toolCall }); } } });
          const assistant = response.choices?.[0]?.message || {};
          if (response.usage) {
            const usage = updateAgentUsage(
              projectId,
              response.usage.promptTokens ?? response.usage.prompt_tokens,
              response.usage.completionTokens ?? response.usage.completion_tokens,
            );
            send(socket, "context_usage", { promptTokens: usage.prompt_tokens, completionTokens: usage.completion_tokens, contextLimit: usage.context_limit });
          }
          const assistantToolCalls = assistant.toolCalls || assistant.tool_calls || [];
          responseMessages.push({ role: "assistant", content: assistant.content || "", ...(assistantToolCalls.length ? { toolCalls: assistantToolCalls } : {}) });
          if (assistant.content || assistantToolCalls.length) addAgentMessage(projectId, "assistant", assistant.content || "", { toolCalls: assistantToolCalls });
          if (!assistantToolCalls.length) break;
          for (const call of assistantToolCalls) {
            if (run.cancelled) break;
            let args = {};
            let argumentError = null;
            try { args = toolArgs(call); } catch (error) { argumentError = error; }
            send(socket, "tool_call_start", { tool: call.function?.name, args: argumentError ? { error: argumentError.message } : args });
            let result;
            try {
              if (argumentError) throw argumentError;
              if (call.function?.name === "edit") { result = await applyEdit(projectId, args); changes.push(result); send(socket, "edit_applied", result); }
              else if (call.function?.name === "search_image") {
                if (!settings.pexel_api) throw new Error("Pexels API key is not configured.");
                const images = await searchImages(settings.pexel_api, args.query, args.orientation || "landscape", args.count || 5);
                result = {
                  status: images.length ? "retrieved" : "no_results",
                  message: images.length ? `Retrieved ${images.length} Pexels image candidates for "${args.query}". Choose one URL for a later edit if the user requested placement.` : `No Pexels images were found for "${args.query}".`,
                  count: images.length,
                  images: images.map(({ id, url, alt, photographer }) => ({ id, url, alt, photographer })),
                };
              }
              else throw new Error("Unknown tool.");
            } catch (error) { result = { error: error.message }; }
            const toolResult = JSON.stringify(result);
            addAgentMessage(projectId, "tool", toolResult, {}, call.function?.name, call.id);
            responseMessages.push({ role: "tool", toolCallId: call.id, content: toolResult });
            send(socket, "tool_result", { tool: call.function?.name, result });
          }
        }
        if (run.cancelled) send(socket, "stopped", { changes, message: "Generation stopped.", cancelled: true });
        else send(socket, "complete", { changes, message: changes.length ? "Edits applied and verified." : "I’m ready for the next presentation change." });
        if (socket.activeRun === run) socket.activeRun = null;
      } catch (error) { console.error("[editor websocket]", error); send(socket, "error", { error: error.message || "Editor request failed." }); }
    });
  });
  return wss;
}
