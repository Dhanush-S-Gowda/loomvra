import fs from "fs";
import path from "path";
import { chatCompletion } from "../services/openrouter.js";
import {
    getSettings,
    getProject,
    updateProject,
    getSlidesByProject,
    upsertSlide,
    markStageCompleted,
    markStageFailed,
} from "../storage/db.js";

/**
 * Strip surrounding markdown code fences (```html ... ```) from a model response.
 * Models frequently wrap HTML in fences even when instructed not to.
 */
function stripCodeFences(text) {
    if (!text) return "";
    let s = String(text).trim();

    const fenceMatch = s.match(/^```(?:[a-zA-Z0-9]*)?\s*\n?([\s\S]*?)\n?```$/);
    if (fenceMatch) {
        s = fenceMatch[1].trim();
    }

    const leadingFence = s.match(/^```(?:[a-zA-Z0-9]*)?\s*\n([\s\S]*)$/);
    if (leadingFence && !s.endsWith("```")) {
        s = leadingFence[1].trim();
    }

    return s;
}

/**
 * Strip forbidden document-level tags from a fragment (defensive).
 */
function stripDocumentTags(html) {
    let s = String(html);
    s = s.replace(/<\!doctype[^>]*>/gi, "");
    s = s.replace(/<\/?(?:html|head|body)[^>]*>/gi, "");
    return s.trim();
}

/**
 * Validate and normalize a master template response.
 *
 * Required structure:
 *   <style>...</style>
 *   <div class="slide">{{CONTENT}}</div>
 *
 * Returns the normalized HTML string, or throws an error if validation fails.
 */
function normalizeMasterTemplate(rawHtml) {
    let html = stripCodeFences(rawHtml);
    html = stripDocumentTags(html);

    if (!html || html.length < 20) {
        throw new Error("Master template response was empty or too short.");
    }

    if (!html.includes("{{CONTENT}}")) {
        throw new Error("Master template is missing the {{CONTENT}} placeholder.");
    }

    const styleMatch = html.match(/<style\b[^>]*>([\s\S]*?)<\/style>/i);
    if (!styleMatch) {
        throw new Error("Master template is missing a <style> block.");
    }

    const slideMatch = html.match(/<div\s+class\s*=\s*["']slide["'][^>]*>([\s\S]*?)<\/div>\s*$/i);
    if (!slideMatch) {
        throw new Error(
            "Master template must end with <div class=\"slide\">{{CONTENT}}</div>."
        );
    }

    if (!html.includes("{{CONTENT}}")) {
        throw new Error("Master template must contain {{CONTENT}} placeholder.");
    }

    // Sanity: ensure no script tags or event handlers.
    if (/<script\b/i.test(html)) {
        throw new Error("Master template must not contain <script> tags.");
    }

    return html;
}

/**
 * Validate and normalize a per-slide response.
 *
 * Required structure:
 *   <style>...</style>
 *   <div ...>...</div>
 *
 * Returns the normalized HTML string, or throws an error if validation fails.
 */
function normalizeSlideFragment(rawHtml) {
    let html = stripCodeFences(rawHtml);
    html = stripDocumentTags(html);

    if (!html || html.length < 10) {
        throw new Error("Slide response was empty after stripping fences.");
    }

    if (!/<style\b[^>]*>[\s\S]*?<\/style>/i.test(html)) {
        throw new Error("Slide response must include a <style> block.");
    }

    if (!/<div\b[^>]*>[\s\S]*?<\/div>/i.test(html)) {
        throw new Error("Slide response must include a <div> container.");
    }

    if (/<script\b/i.test(html)) {
        throw new Error("Slide response must not contain <script> tags.");
    }

    return html;
}

/**
 * Slides Generation Job
 *
 * 1. Re-fetches the design plan from the project row (defensive).
 * 2. Builds a minimal master-template payload (project, globalDesign, masterTemplate plan).
 * 3. Calls the main model -> persists a validated master template with `<style>` + `<div class="slide">{{CONTENT}}</div>`.
 * 4. For each slide, calls the main model with the FULL master template + project + globalDesign + slide plan.
 *    Each slide response must contain `<style>` + `<div>` and is persisted as `html_content`.
 * 5. On success, marks slides_state=completed.
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
        markStageFailed(projectId, "slides", errMsg);
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
        markStageFailed(projectId, "slides", errMsg);
        throw new Error(errMsg);
    }

    const resolvedModel = data?.model || settings?.main_model;
    if (!resolvedModel) {
        const errMsg = "Main model is not configured in settings.";
        console.error(`[SlidesJob] ${errMsg}`);
        markStageFailed(projectId, "slides", errMsg);
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
    // 3. Step 1 — generate the master template with a MINIMAL payload.
    //    Send only project, globalDesign, and masterTemplate plan.
    //    Do NOT send individual slide content.
    // -----------------------------------------------------------------
    const masterUserPayload = {
        project: designPlan.project,
        globalDesign: designPlan.globalDesign,
        masterTemplate: designPlan.masterTemplate,
    };

    let masterTemplate;
    try {
        console.log(
            `[SlidesJob] Generating master template for project ${projectId} with model ${resolvedModel}...`
        );
        const masterResponse = await chatCompletion({
            apiKey,
            model: resolvedModel,
            systemPrompt: masterPromptText,
            userPrompt: JSON.stringify(masterUserPayload),
            options: {
                timeoutMs: 180000,
                strictHtml: true,
            },
        });

        const masterContent = masterResponse.choices?.[0]?.message?.content;
        if (!masterContent) {
            throw new Error("No content returned from model for master template.");
        }

        masterTemplate = normalizeMasterTemplate(masterContent);

        // Persist immediately so partial progress survives mid-loop failures.
        updateProject(projectId, { master_template: masterTemplate });
    } catch (err) {
        const errMsg = `Master template generation failed: ${err.message}`;
        console.error(`[SlidesJob] ${errMsg}`);
        markStageFailed(projectId, "slides", errMsg);
        throw new Error(errMsg);
    }

    // -----------------------------------------------------------------
    // 4. Step 2 — generate each slide.
    //    Send the FULL master template so the model can see the canvas and styles.
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
            });

            const slideResponse = await chatCompletion({
                apiKey,
                model: resolvedModel,
                systemPrompt: slidePromptText,
                userPrompt,
                options: {
                    timeoutMs: 180000,
                    strictHtml: true,
                },
            });

            const slideContent = slideResponse.choices?.[0]?.message?.content;
            if (!slideContent) {
                throw new Error(
                    `No content returned from model for slide ${seqNum}.`
                );
            }

            const fragment = normalizeSlideFragment(slideContent);
            upsertSlide(projectId, seqNum, fragment, []);
        } catch (err) {
            const errMsg = `Slide ${seqNum} generation failed: ${err.message}`;
            console.error(`[SlidesJob] ${errMsg}`);
            markStageFailed(projectId, "slides", errMsg);
            throw new Error(errMsg);
        }
    }

    // -----------------------------------------------------------------
    // 5. Done.
    // -----------------------------------------------------------------
    markStageCompleted(projectId, "slides");
    console.log(`[SlidesJob] Completed for project ${projectId}`);
}
