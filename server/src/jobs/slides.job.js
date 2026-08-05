import fs from "fs";
import path from "path";
import { chatCompletion } from "../services/openrouter.js";
import {
    getSettings,
    getProject,
    updateProject,
    createSlide,
    updateSlide,
    transitionStage,
} from "../storage/db.js";
import SlideSchema from "../schemas/slide.schema.js";
import { processSlide } from "../pipeline/index.js";

/**
 * Call the model with structured output, then normalize + validate the
 * `{ css, html }` result.
 *
 * On validation failure, makes ONE retry call that explains the error to the
 * model in the hope it fixes the output. If the retry also fails, the error is
 * thrown.
 *
 * @param {Object} params
 * @param {string} params.apiKey
 * @param {string} params.model
 * @param {string} params.systemPrompt
 * @param {string} params.userPrompt
 * @param {string} params.label - Human-readable label for logging (e.g. "master template", "slide 3").
 * @returns {Promise<{css: string, html: string}>} Validated slide output.
 */
async function generateValidatedSlide({
    apiKey,
    model,
    systemPrompt,
    userPrompt,
    label,
}) {
    const call = async (prompt) => {
        const response = await chatCompletion({
            apiKey,
            model,
            systemPrompt,
            userPrompt: prompt,
            options: {
                timeoutMs: 180000,
                responseFormat: {
                    type: "json_schema",
                    jsonSchema: SlideSchema,
                },
            },
        });

        const content = response.choices?.[0]?.message?.content;
        if (!content) {
            throw new Error("No content returned from model.");
        }

        let raw;
        try {
            raw = JSON.parse(content);
        } catch (err) {
            throw new Error(`Response is not valid JSON: ${err.message}`);
        }

        return processSlide(raw);
    };

    try {
        return await call(userPrompt);
    } catch (firstErr) {
        console.warn(
            `[SlidesJob] ${label} validation failed (${firstErr.message}). Retrying once with error feedback...`
        );

        const retryPrompt = `${userPrompt}\n\n---\nYour previous response was rejected for the following reason:\n${firstErr.message}\n\nPlease fix the issue and return a valid JSON object with exactly "css" and "html" keys.`;

        try {
            return await call(retryPrompt);
        } catch (retryErr) {
            const errMsg = `${label} failed after retry: ${retryErr.message}`;
            console.error(`[SlidesJob] ${errMsg}`);
            throw new Error(errMsg);
        }
    }
}

/**
 * Slides Generation Job
 *
 * 1. Re-fetches the design plan from the project row (defensive).
 * 2. Generates the master template with structured output `{ css, html }`
 *    and persists it as-is (raw JSON) in `project.master_template`.
 * 3. For each slide, sends the master template + slide plan to the model.
 *    The model returns a complete `{ css, html }` slide (master wrapper +
 *    content together). Each is normalized + validated and persisted as raw
 *    JSON in `slides.html_content`.
 * 4. On success, marks slides_state=completed.
 *    On any failure, marks slides_state=failed with the error message.
 */
export async function generateSlides(data) {
    const { projectId } = data;

    console.log(`[SlidesJob] Starting for project ${projectId}...`);

    // -----------------------------------------------------------------
    // 0. Defensive: re-fetch the project and verify the design plan.
    // -----------------------------------------------------------------
    const project = getProject(projectId);
    if (!project) {
        const errMsg = `Project ${projectId} not found.`;
        console.error(`[SlidesJob] ${errMsg}`);
        throw new Error(errMsg);
    }

    if (project.slides_state === "completed") {
        console.log(`[SlidesJob] Project ${projectId} already completed. Skipping.`);
        return;
    }

    if (project.slides_state !== "processing") {
        const errMsg = `Slides are not in 'processing' state. Current state: ${project.slides_state}.`;
        console.error(`[SlidesJob] ${errMsg}`);
        throw new Error(errMsg);
    }

    let designPlan = null;
    if (project.design_plan) {
        try {
            designPlan = JSON.parse(project.design_plan);
        } catch (err) {
            designPlan = null;
        }
    }

    if (
        !designPlan ||
        !designPlan.slides ||
        !Array.isArray(designPlan.slides) ||
        designPlan.slides.length === 0
    ) {
        const errMsg =
            "Design plan is missing or empty. Cannot generate slides.";
        console.error(`[SlidesJob] ${errMsg}`);
        transitionStage(projectId, "slides", "failed", errMsg);
        throw new Error(errMsg);
    }

    // -----------------------------------------------------------------
    // 1. Resolve settings & model.
    // -----------------------------------------------------------------
    const settings = getSettings();
    const apiKey = settings?.openrouter_api;
    if (!apiKey) {
        const errMsg = "OpenRouter API key is not configured in settings.";
        console.error(`[SlidesJob] ${errMsg}`);
        transitionStage(projectId, "slides", "failed", errMsg);
        throw new Error(errMsg);
    }

    const resolvedModel = data?.model || settings?.main_model;
    if (!resolvedModel) {
        const errMsg = "Main model is not configured in settings.";
        console.error(`[SlidesJob] ${errMsg}`);
        transitionStage(projectId, "slides", "failed", errMsg);
        throw new Error(errMsg);
    }

    // -----------------------------------------------------------------
    // 2. Load prompt templates.
    // -----------------------------------------------------------------
    const promptsDir = path.join(import.meta.dirname, "../prompts");
    const masterPromptText = fs.readFileSync(
        path.join(promptsDir, "slides.master-template.md"),
        "utf-8"
    );
    const slidePromptText = fs.readFileSync(
        path.join(promptsDir, "slides.html.md"),
        "utf-8"
    );

    // -----------------------------------------------------------------
    // 3. Step 1 — generate the master template with structured output.
    //    Send only project, globalDesign, and masterTemplate plan.
    //    Do NOT send individual slide content.
    // -----------------------------------------------------------------
    const masterUserPayload = {
        project: designPlan.project,
        globalDesign: designPlan.globalDesign,
        masterTemplate: designPlan.masterTemplate,
        // Include the user's original project description so the master
        // template stays aligned with the user's intent.
        userDescription: project.user_desc || "",
    };

    let masterTemplate;
    try {
        console.log(
            `[SlidesJob] Generating master template for project ${projectId} with model ${resolvedModel}...`
        );
        masterTemplate = await generateValidatedSlide({
            apiKey,
            model: resolvedModel,
            systemPrompt: masterPromptText,
            userPrompt: JSON.stringify(masterUserPayload),
            label: "Master template",
        });

        // Persist immediately so partial progress survives mid-loop failures.
        updateProject(projectId, { master_template: JSON.stringify(masterTemplate) });
    } catch (err) {
        const errMsg = `Master template generation failed: ${err.message}`;
        console.error(`[SlidesJob] ${errMsg}`);
        transitionStage(projectId, "slides", "failed", errMsg);
        throw new Error(errMsg);
    }

    // -----------------------------------------------------------------
    // 4. Step 2 — generate each slide.
    //    Send the FULL master template so the model can see the canvas and
    //    styles. The model returns the complete slide (master + content).
    // -----------------------------------------------------------------
    for (const slidePlan of designPlan.slides) {
        const seqNum = slidePlan.number;
        console.log(
            `[SlidesJob] Generating slide ${seqNum} for project ${projectId}...`
        );

        try {
            const userPrompt = JSON.stringify({
                masterTemplate, // Full master template this slide should live inside.
                slide: slidePlan,
                project: designPlan.project,
                globalDesign: designPlan.globalDesign,
                // Include the user's original project description so each
                // slide's content stays aligned with the user's intent.
                userDescription: project.user_desc || "",
            });

            const slide = await generateValidatedSlide({
                apiKey,
                model: resolvedModel,
                systemPrompt: slidePromptText,
                userPrompt,
                label: `Slide ${seqNum}`,
            });

            const htmlContent = JSON.stringify(slide);
            // A generated slide has no row yet on the first run. Insert it
            // through the public createSlide helper, and only update when a
            // retry is processing a row that already exists.
            try {
                createSlide(projectId, seqNum, htmlContent, []);
            } catch (insertErr) {
                if (!String(insertErr.message).includes("UNIQUE")) {
                    throw insertErr;
                }
                updateSlide(projectId, seqNum, {
                    html_content: htmlContent,
                    images_path: [],
                });
            }
        } catch (err) {
            const errMsg = `Slide ${seqNum} generation failed: ${err.message}`;
            console.error(`[SlidesJob] ${errMsg}`);
            transitionStage(projectId, "slides", "failed", errMsg);
            throw new Error(errMsg);
        }
    }

    // -----------------------------------------------------------------
    // 5. Done.
    // -----------------------------------------------------------------
    transitionStage(projectId, "slides", "completed");
    console.log(`[SlidesJob] Completed for project ${projectId}`);
}
