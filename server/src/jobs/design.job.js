import { chatCompletion } from "../services/openrouter.js";
import { searchImage } from "../services/pexels.js";
import {
  getSettings,
  updateProject,
  transitionStage,
  updateProgress
} from "../storage/db.js";
import fs from "fs";
import path from "path";
import PlanningSchema from "../schemas/planning.schema.js";
import PlanningZodSchema from "../schemas/planning.zod.js";

export async function generateDesignPlan(data) {
  const { projectId, userInput, model, brand = {} } = data;

  console.log(`[DesignJob] Starting for project ${projectId}...`);
  updateProgress(projectId, 5, "Preparing design plan");

  const settings = getSettings();
  const apiKey = settings?.openrouter_api;
  const pexelApiKey = settings?.pexel_api;

  if (!apiKey) {
      const errMsg = "OpenRouter API key is not configured in settings.";
      console.error(`[DesignJob] ${errMsg}`);
      transitionStage(projectId, "design", "failed", errMsg);
      throw new Error(errMsg);
  }
  if (!pexelApiKey) {
      const errMsg = "Pexels API key is not configured in settings.";
      console.error(`[DesignJob] ${errMsg}`);
      transitionStage(projectId, "design", "failed", errMsg);
      throw new Error(errMsg);
  }

  const resolvedModel = model || settings?.design_model || "deepseek/deepseek-v4-flash";

  const planPath = path.join(import.meta.dirname, "../prompts/planning.md");
  const baseSystemPrompt = fs.readFileSync(planPath, "utf-8");
  const customPrompt = settings.design_custom_prompt?.trim();
  const systemPrompt = customPrompt
      ? `${baseSystemPrompt}\n\n[ADDITIONAL USER INSTRUCTIONS]\n${customPrompt}`
      : baseSystemPrompt;

  console.log(`[DesignJob] Calling OpenRouter for project ${projectId} with model ${resolvedModel}...`);
  updateProgress(projectId, 15, "Generating design plan with AI");
  let response;
  try {
      response = await chatCompletion({
          apiKey,
          model: resolvedModel,
          systemPrompt,
          userPrompt: [
              userInput,
              Object.keys(brand).length ? `\n\nUser-provided brand requirements (apply only the supplied values; choose no defaults for omitted fields):\n${JSON.stringify(brand, null, 2)}` : "",
          ].join(""),
          options: {
              responseFormat: {
                  type: "json_schema",
                  jsonSchema: PlanningSchema,
              },
              stream: true,
              timeoutMs: Number.parseInt(process.env.OPENROUTER_TIMEOUT_MS || "900000", 10),
              onChunk: ({ contentLength }) => {
                  // A streamed chunk is also a liveness signal. Keep the UI
                  // informed without pretending token count is completion %.
                  if (contentLength % 1000 < 100) {
                      updateProgress(projectId, 15, "AI is still generating the design plan");
                  }
              },
          },
      });
  } catch (err) {
      const errMsg = `OpenRouter API error: ${err.message}`;
      console.error(`[DesignJob] ${errMsg}`);
      transitionStage(projectId, "design", "failed", errMsg);
      throw err;
  }

  const plan = response.choices?.[0]?.message?.content;
  if (!plan) {
      const errMsg = "No content returned from OpenRouter.";
      console.error(`[DesignJob] ${errMsg}`);
      transitionStage(projectId, "design", "failed", errMsg);
      throw new Error(errMsg);
  }

  let designPlan;
  try {
      designPlan = JSON.parse(plan);
  } catch {
      const errMsg = "Failed to parse OpenRouter response as JSON.";
      console.error(`[DesignJob] ${errMsg}`);
      transitionStage(projectId, "design", "failed", errMsg);
      throw new Error(errMsg);
  }

  const parsed = PlanningZodSchema.safeParse(designPlan);
  if (!parsed.success) {
      const errMsg = `Design plan failed validation: ${parsed.error.message}`;
      console.error(`[DesignJob] ${errMsg}`);
      transitionStage(projectId, "design", "failed", errMsg);
      throw new Error(errMsg);
  }
  designPlan = parsed.data;

  // Keep the supplied brand assets explicit and inspectable in the saved plan.
  if (Object.keys(brand).length) {
      designPlan.brand = brand;
      if (brand.palette?.primary) designPlan.globalDesign.primary_color = brand.palette.primary;
      if (brand.palette?.secondary) designPlan.globalDesign.secondary_color = brand.palette.secondary;
      if (brand.palette?.tertiary) designPlan.globalDesign.accent_color = brand.palette.tertiary;
      if (brand.fonts?.heading) designPlan.globalDesign.heading_font = brand.fonts.heading;
      if (brand.fonts?.body) designPlan.globalDesign.body_font = brand.fonts.body;
  }

  updateProgress(projectId, 65, "Finding images for the design plan");
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

  updateProgress(projectId, 90, "Saving design plan");
  updateProject(projectId, {
      design_plan: JSON.stringify(designPlan),
      design_error: null,
  });

  updateProgress(projectId, 100, "Design plan ready");
  const completed = transitionStage(projectId, "design", "completed");
  if (!completed) {
      console.warn(
          `[DesignJob] Project ${projectId} state transition was no-op (state: ${projectId}).`
      );
  }

  console.log(`[DesignJob] Completed for project ${projectId}`);
}
