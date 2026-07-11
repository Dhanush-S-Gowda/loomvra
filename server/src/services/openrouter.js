import { OpenRouter as OpenRouterClient } from "@openrouter/sdk";
import "dotenv/config";

const OpenRouter = new OpenRouterClient({
  appTitle: "nextGenPPT",
  apiKey: process.env.OPENROUTER_API_KEY,
});

export default OpenRouter;
