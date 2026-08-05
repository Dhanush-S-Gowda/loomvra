import axios from "axios";

export default async function getSupportedModels() {
  const ALLOWED_PROVIDERS = [
    "anthropic",
    "deepseek",
    "google",
    "meta",
    "moonshotai",
    "openai",
    "qwen",
    "x-ai",
    "z-ai",
  ];

  const providerSet = new Set(ALLOWED_PROVIDERS);

  try {
    const { data } = await axios.get(
      "https://openrouter.ai/api/v1/models",
      {
        timeout: 10000,
      }
    );

    if (!data?.data || !Array.isArray(data.data)) {
      throw new Error("Invalid response from OpenRouter");
    }

    const grouped = new Map();

    for (const model of data.data) {
      const provider = model.id.split("/")[0];

      if (!providerSet.has(provider)) {
        continue;
      }

      const inputModalities = model.architecture?.input_modalities ?? [];
      const outputModalities = model.architecture?.output_modalities ?? [];

      if (
        !inputModalities.includes("text") ||
        outputModalities.length !== 1 ||
        outputModalities[0] !== "text" ||
        !model.supported_parameters?.includes("response_format")
      ) {
        continue;
      }

      if (!grouped.has(provider)) {
        grouped.set(provider, []);
      }
      const modelName = model.name.includes(":")
       ? model.name.substring(model.name.indexOf(":") + 1).trim()
       : model.name;

     grouped.get(provider).push({
        id: model.id,
        name: modelName,
        pricing: {
          promptPerM:
            Number(model.pricing?.prompt ?? 0) * 1_000_000,
          completionPerM:
            Number(model.pricing?.completion ?? 0) * 1_000_000,
          inputCacheReadPerM:
            model.pricing?.input_cache_read != null
              ? Number(model.pricing.input_cache_read) *
               1_000_000
              : null,
        },
      });
    }

    return ALLOWED_PROVIDERS.map(provider => ({
      provider,
      models: (grouped.get(provider) || []).sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
    })).filter(group => group.models.length > 0);
  } catch (err) {
    console.error("Failed to fetch OpenRouter models:", err.message);
    throw err;
  }
}
