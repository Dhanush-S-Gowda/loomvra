import fs from "fs";
import path from "path";
import { chatCompletion } from "../services/openrouter.js";
import {
    getSettings,
    getProject,
    updateProject,
    createSlide,
    updateSlide,
    updateProgress,
    transitionStage,
} from "../storage/db.js";
import SlideSchema from "../schemas/slide.schema.js";
import { processSlide, composeSlideOutput, assertRenderedSlide } from "../pipeline/index.js";

async function generateValidatedSlide({
    apiKey,
    model,
    systemPrompt,
    userPrompt,
    label,
    onChunk,
    masterTemplate,
}) {
    const call = async (prompt) => {
        const response = await chatCompletion({
            apiKey,
            model,
            systemPrompt,
            userPrompt: prompt,
            options: {
                stream: true,
                timeoutMs: Number.parseInt(process.env.OPENROUTER_TIMEOUT_MS || "900000", 10),
                onChunk,
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

        const validated = processSlide(raw);
        const composed = masterTemplate ? processSlide(composeSlideOutput(validated, masterTemplate)) : validated;
        if (masterTemplate) await assertRenderedSlide(composed, label);
        return composed;
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

export async function generateSlides(data) {
    const { projectId } = data;

    console.log(`[SlidesJob] Starting for project ${projectId}...`);
    updateProgress(projectId, 5, "Preparing slide generation");
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
        throw new Error(errMsg);
    }
    const settings = getSettings();
    const apiKey = settings?.openrouter_api;
    if (!apiKey) {
        const errMsg = "OpenRouter API key is not configured in settings.";
        console.error(`[SlidesJob] ${errMsg}`);
        throw new Error(errMsg);
    }

    const resolvedModel = data?.model || settings?.main_model;
    if (!resolvedModel) {
        const errMsg = "Main model is not configured in settings.";
        console.error(`[SlidesJob] ${errMsg}`);
        throw new Error(errMsg);
    }
    const promptsDir = path.join(import.meta.dirname, "../prompts");
    const masterPromptText = fs.readFileSync(
        path.join(promptsDir, "slides.master-template.md"),
        "utf-8"
    );
    const slidePromptText = fs.readFileSync(
        path.join(promptsDir, "slides.html.md"),
        "utf-8"
    );
    const customPrompt = settings.slides_custom_prompt?.trim();
    const appendCustomPrompt = (prompt) => customPrompt
        ? `${prompt}\n\n[ADDITIONAL USER INSTRUCTIONS]\n${customPrompt}`
        : prompt;
    const masterUserPayload = {
        project: designPlan.project,
        globalDesign: designPlan.globalDesign,
        masterTemplate: designPlan.masterTemplate,
      brand: designPlan.brand || null,
        // Include the user's original project description so the master
        // template stays aligned with the user's intent.
        userDescription: project.user_desc || "",
    };

    let masterTemplate;
    try {
        console.log(
            `[SlidesJob] Generating master template for project ${projectId} with model ${resolvedModel}...`
        );
        updateProgress(projectId, 10, "Generating master template");
        masterTemplate = await generateValidatedSlide({
            apiKey,
            model: resolvedModel,
            systemPrompt: appendCustomPrompt(masterPromptText),
            userPrompt: JSON.stringify(masterUserPayload),
            label: "Master template",
            onChunk: ({ contentLength }) => {
                if (contentLength % 1000 < 100) {
                    updateProgress(projectId, 10, "AI is generating the master template");
                }
            },
        });

        await assertRenderedSlide(masterTemplate, "master template");
        // Persist immediately so partial progress survives mid-loop failures.
        updateProject(projectId, { master_template: JSON.stringify(masterTemplate) });
    } catch (err) {
        const errMsg = `Master template generation failed: ${err.message}`;
        console.error(`[SlidesJob] ${errMsg}`);
        throw new Error(errMsg);
    }
    for (const [index, slidePlan] of designPlan.slides.entries()) {
        const seqNum = slidePlan.number;
        const slideProgress = 20 + Math.round((index / designPlan.slides.length) * 75);
        updateProgress(projectId, slideProgress, `Generating slide ${index + 1} of ${designPlan.slides.length}`);
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
                systemPrompt: appendCustomPrompt(slidePromptText),
                userPrompt,
                label: `Slide ${seqNum}`,
                onChunk: ({ contentLength }) => {
                    if (contentLength % 1000 < 100) {
                        updateProgress(projectId, slideProgress, `AI is generating slide ${index + 1} of ${designPlan.slides.length}`);
                    }
                },
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
            throw new Error(errMsg);
        }
    }
    updateProgress(projectId, 100, "Slides ready");
    transitionStage(projectId, "slides", "completed");
    console.log(`[SlidesJob] Completed for project ${projectId}`);
}
