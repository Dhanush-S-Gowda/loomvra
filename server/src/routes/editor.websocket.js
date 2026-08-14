import fs from "fs";
import path from "path";
import { WebSocketServer, WebSocket } from "ws";
import { chatCompletion } from "../services/openrouter.js";
import { persistImageInput } from "../services/imageStorage.js";
import {
  getProject,
  getSettings,
  getSlidesByProject,
  updateSlide,
} from "../storage/db.js";
import { processSlide, composeSlideOutput, assertRenderedSlide } from "../pipeline/index.js";
import { renderSlide } from "../pipeline/index.js";

const smallPrompt = fs.readFileSync(path.join(import.meta.dirname, "../prompts/editor-small.md"), "utf8");
const mainPrompt = fs.readFileSync(path.join(import.meta.dirname, "../prompts/editor-main.md"), "utf8");

function send(socket, type, payload = {}) {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type, ...payload }));
}

function parseModelJson(response) {
  const content = response?.choices?.[0]?.message?.content;
  if (!content) throw new Error("The model returned no content.");
  const text = Array.isArray(content) ? content.map((part) => part.text || "").join("") : content;
  return JSON.parse(String(text).replace(/^```json\s*|```$/g, "").trim());
}

function readStoredSlide(row) {
  try {
    const value = JSON.parse(row.html_content || "{}");
    return processSlide(value);
  } catch (error) {
    throw new Error(`Slide ${row.seq_num} is invalid: ${error.message}`);
  }
}

function normalizeSlideNumbers(value, available) {
  const requested = Array.isArray(value) ? value.map(Number).filter(Number.isInteger) : [];
  return [...new Set(requested)].filter((number) => available.has(number));
}

async function askModel({ apiKey, model, systemPrompt, payload }) {
  const response = await chatCompletion({
    apiKey,
    model,
    systemPrompt,
    userPrompt: JSON.stringify(payload),
    options: { timeoutMs: 180000, reasoning: { effort: "none" } },
  });
  return parseModelJson(response);
}

export function attachEditorWebSocket(server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const pathname = new URL(request.url, "http://localhost").pathname;
    const match = pathname.match(/^\/ws\/project\/([^/]+)$/);
    if (!match) return;
    wss.handleUpgrade(request, socket, head, (client) => {
      client.projectId = match[1];
      wss.emit("connection", client, request);
    });
  });

  wss.on("connection", (socket) => {
    const projectId = String(socket.projectId).replace(/^proj-/, "");
    if (!getProject(projectId)) {
      send(socket, "error", { error: "Project not found" });
      socket.close(1008);
      return;
    }
    send(socket, "ready", { projectId: Number(projectId) });

    socket.on("message", async (raw) => {
      try {
        const message = JSON.parse(raw.toString());
        if (message.type !== "edit") {
          send(socket, "error", { error: "Message type must be 'edit'." });
          return;
        }
        if (typeof message.prompt !== "string" || !message.prompt.trim()) {
          send(socket, "error", { error: "prompt is required" });
          return;
        }

        const project = getProject(projectId);
        const settings = getSettings();
        if (!settings.openrouter_api || !settings.small_model || !settings.main_model) {
          send(socket, "error", { error: "OpenRouter, small_model, and main_model must be configured in settings." });
          return;
        }

        const rows = getSlidesByProject(projectId);
        const available = new Set(rows.map((row) => row.seq_num));
        const explicitSlides = normalizeSlideNumbers(message.slideNumbers, available);
        const images = [];
        for (const image of Array.isArray(message.images) ? message.images : []) {
          const source = typeof image === "string" ? image : image?.url || image?.src;
          if (!source) continue;
          const url = await persistImageInput(projectId, source);
          images.push({ url, purpose: typeof image === "object" ? image.purpose || "" : "" });
        }

        const storedSlides = rows.map((row) => {
          const slide = readStoredSlide(row);
          return { slideNumber: row.seq_num, content: explicitSlides.length === 0 || explicitSlides.includes(row.seq_num) ? slide : undefined };
        }).filter((slide) => slide.content);

        send(socket, "status", { stage: "context", message: "Building edit context with the small model." });
        const context = await askModel({
          apiKey: settings.openrouter_api,
          model: settings.small_model,
          systemPrompt: smallPrompt,
          payload: {
            project: { id: project.id, name: project.name, description: project.user_desc },
            userPrompt: message.prompt,
            requestedSlideNumbers: explicitSlides,
            images,
            slides: storedSlides,
          },
        });

        const chosenSlides = normalizeSlideNumbers(context.slideNumbers, available);
        if (context.needsClarification || !context.context || chosenSlides.length === 0) {
          send(socket, "clarification", {
            question: context.question || "Which slide should I change, and what should it do?",
            slideNumbers: chosenSlides,
          });
          return;
        }

        const masterTemplate = project.master_template ? JSON.parse(project.master_template) : null;
        const selectedContent = rows.filter((row) => chosenSlides.includes(row.seq_num)).map((row) => ({
          slideNumber: row.seq_num,
          content: readStoredSlide(row),
        }));
        send(socket, "status", { stage: "editing", message: "Applying minimal edits with the main model.", slideNumbers: chosenSlides });
        const result = await askModel({
          apiKey: settings.openrouter_api,
          model: settings.main_model,
          systemPrompt: mainPrompt,
          payload: { userPrompt: message.prompt, context, images, masterTemplate, slides: selectedContent },
        });

        const changes = [];
        const pendingUpdates = [];
        for (const edit of Array.isArray(result.edits) ? result.edits : []) {
          const number = Number(edit.slideNumber);
          const target = edit.target === "css" ? "css" : edit.target === "html" ? "html" : null;
          if (!chosenSlides.includes(number) || !target || typeof edit.oldCode !== "string" || !edit.oldCode || typeof edit.newCode !== "string") continue;
          const row = rows.find((item) => item.seq_num === number);
          const current = readStoredSlide(row);
          const index = current[target].indexOf(edit.oldCode);
          if (index < 0 || current[target].indexOf(edit.oldCode, index + 1) >= 0) continue;
          const updated = { ...current, [target]: current[target].slice(0, index) + edit.newCode + current[target].slice(index + edit.oldCode.length) };
          const validated = processSlide(updated);
          const composed = masterTemplate ? processSlide(composeSlideOutput(validated, masterTemplate)) : validated;
          await assertRenderedSlide(composed, number);
          pendingUpdates.push({ number, html_content: JSON.stringify(composed) });
          changes.push({ slideNumber: number, target, oldCode: edit.oldCode, newCode: edit.newCode, content: renderSlide(composed, number) });
        }
        for (const update of pendingUpdates) {
          updateSlide(projectId, update.number, { html_content: update.html_content });
        }
        send(socket, "complete", { context, changes, message: changes.length ? "Slide edits applied." : "No safe exact edits were returned." });
      } catch (error) {
        console.error("[editor websocket]", error);
        send(socket, "error", { error: error.message || "Editor request failed." });
      }
    });
  });

  return wss;
}
