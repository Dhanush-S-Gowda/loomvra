import { OpenRouter as OpenRouterClient } from "@openrouter/sdk";

/**
 * Send a chat completion request to OpenRouter.
 *
 * Response-format options:
 *  - `responseFormat: { type: 'json_schema', jsonSchema: {...} }` — Strict JSON output.
 *  - `responseFormat: { type: 'grammar', grammar: '<gbnf>' }` — Grammar-constrained output.
 *  - `strictHtml: true` — Injects extra HTML-only instructions into the system prompt.
 *
 * @param {Object} params
 * @param {string} params.apiKey       - OpenRouter API key
 * @param {string} params.model        - Model name (e.g. "deepseek/deepseek-v4-flash")
 * @param {string} params.systemPrompt - System prompt content
 * @param {string} params.userPrompt   - User prompt content
 * @param {Object} [params.options]    - Additional options
 * @returns {Promise<Object>} The OpenRouter chat completion response
 */
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
    });

    const { stream, responseFormat, timeoutMs, strictHtml, temperature } = options;

    const finalSystemPrompt = strictHtml
        ? `${systemPrompt}\n\n[STRICT HTML MODE]\n` +
          `Return ONLY raw HTML. No markdown, no code fences, no explanations, no JSON. ` +
          `Output must be valid HTML that can be inserted into a page directly.`
        : systemPrompt;

    const chatRequest = {
        model,
        messages: [
            { role: "system", content: finalSystemPrompt },
            { role: "user", content: userPrompt },
        ],
    };

    if (responseFormat) {
        chatRequest.responseFormat = responseFormat;
    }

    if (temperature !== undefined) {
        chatRequest.temperature = temperature;
    }

    if (stream) {
        chatRequest.stream = true;
    }

    const response = await client.chat.send(
        {
            chatRequest,
        },
        {
            timeoutMs: timeoutMs || 120000,
            retries: {
                strategy: "none",
            },
        }
    );

    return response;
}
