import fs from "fs"
import path from "path"
import preparePlan from "./utils/preparePlan.js"

const userInput = "I want a ppt where it explains about the impact of fertilizers in agriculture mainly focused in indian context. total of 10 slides required. start from history, to present and then also the future implications."
const model = "deepseek/deepseek-v4-flash"

const response = await preparePlan(userInput, model, { stream: true })

let fullContent = ""

for await (const chunk of response) {
  // Check for mid-stream errors
  if ("error" in chunk) {
    console.error(`Stream error: ${chunk.error.message}`)
    if (chunk.choices?.[0]?.finish_reason === "error") {
      console.log("Stream terminated due to error")
      process.exit(1)
    }
    continue
  }

  const content = chunk.choices?.[0]?.delta?.content
  if (content) {
    console.log(content)
    fullContent += content
    process.stdout.write(content)
  }

  // Log reasoning if the model streams it
  const delta = chunk.choices?.[0]?.delta
  if (delta?.reasoning) {
    console.log("=== MODEL REASONING ===")
    console.log(delta.reasoning)
    console.log("=== END REASONING ===")
  }

  // Final chunk includes usage stats
  if (chunk.usage) {
    console.log("\n\n=== USAGE ===")
    console.log(chunk.usage)
  }
  if (chunk.provider) {
    console.log("Provider:", chunk.provider)
  }
  if (chunk.model) {
    console.log("Model:", chunk.model)
  }
}

// Write the accumulated plan content to file
const writeTo = path.join(process.cwd(), "plan.md")
fs.writeFileSync(writeTo, fullContent)
