import fs from "fs"
import path from "path"
import preparePlan from "./utils/preparePlan.js"

const userInput = "I want a ppt where it explains about the impact of fertilizers in agriculture mainly focused in indian context. total of 10 slides required. start from history, to present and then also the future implications."
const model = "deepseek/deepseek-v4-flash"

const response = await preparePlan(userInput, model)
console.log(response.provider);
console.log(response.model);

console.log(response.usage);
// Log intermediate thinking / reasoning if the model provides it
const message = response.choices[0].message
if (message.reasoning) {
  console.log("=== MODEL REASONING ===")
  console.log(message.reasoning)
  console.log("=== END REASONING ===")
}
if (message.reasoningDetails) {
  console.log("=== REASONING DETAILS ===")
  for (const detail of message.reasoningDetails) {
    console.log(JSON.stringify(detail, null, 2))
  }
  console.log("=== END REASONING DETAILS ===")
}

// Write the plan content to file
const writeTo = path.join(process.cwd(), "plan.md")
fs.writeFileSync(writeTo, message.content)
