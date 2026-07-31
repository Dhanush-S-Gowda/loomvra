import { chatCompletion } from "../services/openrouter.js";
import { searchImage } from "../services/pexels.js";
import {
    getSettings,
    updateProject,
    markStageCompleted,
    markStageFailed,
} from "../storage/db.js";
import fs from "fs";
import path from "path";
import PlanningSchema from "../schemas/planning.schema.js";

/**
 * Design Plan Job
 *
 * 1. Reads the planning prompt from disk.
 * 2. Calls OpenRouter (via chatCompletion) with the API key from settings.
 * 3. For each slide's images array, fetches a Pexels image and adds a `src` key.
 * 4. Updates the project row with the enriched design plan and marks design_state = completed.
 *    On failure, marks design_state = failed with the error message.
 */
export async function generateDesignPlan(data) {
    const { projectId, userInput, model } = data;

    console.log(`[DesignJob] Starting for project ${projectId}...`);

    // 1. Get settings for API keys
    const settings = getSettings();
    const apiKey = settings?.openrouter_api;
    const pexelApiKey = settings?.pexel_api;

    if (!apiKey) {
        const errMsg = "OpenRouter API key is not configured in settings.";
        console.error(`[DesignJob] ${errMsg}`);
        markStageFailed(projectId, "design", errMsg);
        throw new Error(errMsg);
    }

    const resolvedModel = model || settings?.design_model || "deepseek/deepseek-v4-flash";

    // 2. Read the planning prompt
    const planPath = path.join(import.meta.dirname, "../prompts/planning.md");
    const systemPrompt = fs.readFileSync(planPath, "utf-8");

    // 3. Call OpenRouter
    console.log(`[DesignJob] Calling OpenRouter for project ${projectId} with model ${resolvedModel}...`);
    let response;
    try {
        response = await chatCompletion({
            apiKey,
            model: resolvedModel,
            systemPrompt,
            userPrompt: userInput,
            options: {
                responseFormat: {
                    type: "json_schema",
                    jsonSchema: PlanningSchema,
                },
                timeoutMs: 120000,
            },
        });
    } catch (err) {
        const errMsg = `OpenRouter API error: ${err.message}`;
        console.error(`[DesignJob] ${errMsg}`);
        markStageFailed(projectId, "design", errMsg);
        throw err;
    }

    // 4. Parse the design plan
    const plan = response.choices?.[0]?.message?.content;
    if (!plan) {
        const errMsg = "No content returned from OpenRouter.";
        console.error(`[DesignJob] ${errMsg}`);
        markStageFailed(projectId, "design", errMsg);
        throw new Error(errMsg);
    }

    let designPlan;
    try {
        designPlan = JSON.parse(plan);
    } catch {
        const errMsg = "Failed to parse OpenRouter response as JSON.";
        console.error(`[DesignJob] ${errMsg}`);
        markStageFailed(projectId, "design", errMsg);
        throw new Error(errMsg);
    }

    // 5. Enrich images with Pexels URLs
    if (designPlan.slides && Array.isArray(designPlan.slides)) {
        for (const slide of designPlan.slides) {
            if (slide.images && Array.isArray(slide.images)) {
                for (const img of slide.images) {
                    if (img.keyword && pexelApiKey) {
                        try {
                            const src = await searchImage(
                                pexelApiKey,
                                img.keyword,
                                img.orientation || "landscape"
                            );
                            img.src = src || "";
                        } catch (err) {
                            console.error(
                                `[DesignJob] Pexels fetch failed for "${img.keyword}":`,
                                err.message
                            );
                            img.src = "";
                        }
                    } else {
                        img.src = "";
                    }
                }
            }
        }
    }

    // 6. Save the enriched design plan (without touching state — markStageCompleted handles that).
    updateProject(projectId, {
        design_plan: JSON.stringify(designPlan),
        design_error: null,
        design_status: 1,
    });

    const completed = markStageCompleted(projectId, "design");
    if (!completed) {
        console.warn(
            `[DesignJob] Project ${projectId} state transition was no-op (state: ${projectId}).`
        );
    }

    console.log(`[DesignJob] Completed for project ${projectId}`);
}
