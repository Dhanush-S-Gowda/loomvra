import OpenRouter from "../services/openrouter.js";
import PlanningSchema from "../schemas/planning.schema.js";
import { searchImage } from "../services/pexels.js";
import { getSettings, updateProject } from "../storage/db.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Design Plan Job
 *
 * 1. Calls OpenRouter to generate the design plan.
 * 2. For each slide's images array, fetches a Pexels image and adds a `src` key.
 * 3. Updates the project row with the enriched design plan and sets design_status = true.
 */
export async function generateDesignPlan(data) {
    const { projectId, userInput, model } = data;

    console.log(`[DesignJob] Starting for project ${projectId}...`);

    // 1. Get settings for API keys
    const settings = getSettings();
    const pexelApiKey = settings?.pexel_api;

    // 2. Read the planning prompt
    const planPath = path.join(__dirname, "../prompts/planning.md");
    const planContent = fs.readFileSync(planPath, "utf-8");

    // 3. Call OpenRouter
    console.log(`[DesignJob] Calling OpenRouter for project ${projectId}...`);
    const response = await OpenRouter.chat.send({
        chatRequest: {
            model: model || settings?.design_model || "deepseek/deepseek-v4-flash",
            messages: [
                { role: "system", content: planContent },
                { role: "user", content: userInput },
            ],
            responseFormat: {
                type: "json_schema",
                jsonSchema: PlanningSchema,
            },
            stream: false,
        },
    }, {
        timeoutMs: 120000,
        retries: { strategy: "none" },
    });

    // 4. Parse the design plan
    const plan = response.choices?.[0]?.message?.content;
    if (!plan) {
        throw new Error(`[DesignJob] No content returned from OpenRouter for project ${projectId}`);
    }

    let designPlan;
    try {
        designPlan = JSON.parse(plan);
    } catch {
        throw new Error(`[DesignJob] Failed to parse OpenRouter response as JSON for project ${projectId}`);
    }

    // 5. Enrich images with Pexels URLs
    if (designPlan.slides && Array.isArray(designPlan.slides)) {
        for (const slide of designPlan.slides) {
            if (slide.images && Array.isArray(slide.images)) {
                for (const img of slide.images) {
                    if (img.keyword && pexelApiKey) {
                        try {
                            const src = await searchImage(pexelApiKey, img.keyword, img.orientation || "landscape");
                            img.src = src || "";
                        } catch (err) {
                            console.error(`[DesignJob] Pexels fetch failed for "${img.keyword}":`, err.message);
                            img.src = "";
                        }
                    } else {
                        img.src = "";
                    }
                }
            }
        }
    }

    // 6. Save the enriched design plan and mark design_status as true
    updateProject(projectId, {
        design_plan: JSON.stringify(designPlan),
        design_status: 1,
    });

    console.log(`[DesignJob] Completed for project ${projectId}`);
}