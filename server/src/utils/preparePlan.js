import OpenRouter from "../services/openrouter.js"
import PlanningSchema from "../schemas/planning.schema.js"
import fs from "fs"
import path from "path"

export default async function preparePlan(userInput, model) {
    const planPath = path.join(import.meta.dirname, "../prompts/planning.md");
    const planContent = fs.readFileSync(planPath, "utf-8");

    const response = await OpenRouter.chat.send({
        chatRequest: {
            model: model,
            messages: [
                { role: "system", content: planContent },
                { role: "user", content: userInput },
            ],
            responseFormat: {
                type: "json_schema",
                jsonSchema: PlanningSchema,
            },
        },
    }, {
        timeoutMs: 120000,
        retries: {
            strategy: "none",
        },
    });

    return response;
}
