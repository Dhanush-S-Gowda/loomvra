import { OpenRouter as OpenRouterClient } from "@openrouter/sdk";

export async function chatCompletion({
  apiKey,
  model,
  systemPrompt,
  userPrompt,
  options = {},
}) {
  const client = new OpenRouterClient({
    appTitle: "nextGenPPT",
    apiKey,
    httpReferer: "http://localhost:3000",
  });

  const {
    stream = true,
    responseFormat,
    timeoutMs = Number.parseInt(process.env.OPENROUTER_TIMEOUT_MS || "900000", 10),
    strictHtml,
    temperature,
    reasoning = { effort: "none" },
    onChunk,
    tools,
    toolChoice,
    messages,
  } = options;

  const finalSystemPrompt = strictHtml
    ? `${systemPrompt}\n\n[STRICT HTML MODE]\n` +
     `Return ONLY raw HTML. No markdown, no code fences, no explanations` +
     `Output must be valid HTML that can be inserted into a page directly.`
    : systemPrompt;

  const chatRequest = {
    model,
    messages: messages || [
      { role: "system", content: finalSystemPrompt },
      { role: "user", content: userPrompt },
    ],
  };

  if (tools) chatRequest.tools = tools;
  if (toolChoice) chatRequest.toolChoice = toolChoice;

  if (responseFormat) {
    chatRequest.responseFormat = responseFormat;
  }

  if (temperature !== undefined) {
    chatRequest.temperature = temperature;
  }

  if (reasoning !== false) {
    chatRequest.reasoning = reasoning;
  }

  if (stream) {
    chatRequest.stream = true;
    // OpenRouter omits usage from streamed chunks unless explicitly requested.
    chatRequest.streamOptions = { includeUsage: true };
  }

  const response = await client.chat.send(
    {
      chatRequest,
    },
    {
      timeoutMs,
      retries: {
        strategy: "none",
      },
    }
  );

  if (!stream) return response;

  // OpenRouter returns an async iterable for streaming responses. Assemble the
  // same shape as a non-streaming response so callers keep their current JSON
  // parsing and validation logic.
  let content = "";
  let reasoningText = "";
  const toolCalls = [];
  let usage = null;
  for await (const chunk of response) {
    if (chunk?.error) {
      throw new Error(chunk.error.message || "OpenRouter streaming error");
    }
    const deltaObject = chunk?.choices?.[0]?.delta || {};
    const delta = deltaObject.content;
    if (typeof delta === "string") {
      content += delta;
      onChunk?.({ delta, contentLength: content.length });
    }
    if (typeof deltaObject.reasoning === "string") {
      reasoningText += deltaObject.reasoning;
      onChunk?.({ type: "reasoning", delta: deltaObject.reasoning });
    }
    for (const toolCall of deltaObject.tool_calls || deltaObject.toolCalls || []) {
      const index = Number(toolCall.index || 0);
      toolCalls[index] = {
        ...(toolCalls[index] || {}),
        id: toolCall.id || toolCalls[index]?.id,
        type: toolCall.type || "function",
        function: {
          ...(toolCalls[index]?.function || {}),
          ...(toolCall.function || {}),
          arguments: `${toolCalls[index]?.function?.arguments || ""}${toolCall.function?.arguments || ""}`,
        },
      };
      onChunk?.({ type: "tool_call", toolCall: toolCalls[index] });
    }
    if (chunk?.usage) usage = chunk.usage;
  }

  return { choices: [{ message: { content, reasoning: reasoningText, toolCalls: toolCalls.filter(Boolean) } }], usage };
}
