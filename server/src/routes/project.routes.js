import { Router } from "express";
import crypto from "crypto";
import {
  createProject,
  getProject,
  updateProject,
  deleteProject,
  getSlidesByProject,
  getAllProjects,
  checkProjectNameExists,
  renameProject,
  getSettings,
  transitionStage,
  updateProgress,
  updateSlide,
} from "../storage/db.js";
import { renderSlide, processSlide } from "../pipeline/index.js";
import StorageMng from "../services/StorageMng.js";
import designQueue from "../queues/design.queue.js";
import slidesQueue from "../queues/slides.queue.js";
import { exportPdf, exportPptx } from "../services/exporter.js";

const router = Router();

/**
 * Parse a stored slide (raw `{ css, html }` JSON) from the database.
 * Returns null if the stored value is missing or invalid.
 */
function parseStoredSlide(raw) {
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return null;
        if (typeof parsed.css !== "string" || typeof parsed.html !== "string") {
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
}

function normalizeStoredImageUrls(projectId, designPlan) {
  if (!designPlan) return designPlan;
  const images = [];
  if (designPlan.masterTemplate?.image) images.push(designPlan.masterTemplate.image);
  for (const slide of designPlan.slides || []) {
    if (Array.isArray(slide.images)) images.push(...slide.images);
  }
  for (const image of images) {
      if (!image || typeof image.src !== "string") continue;
      try {
        const parsed = new URL(image.src);
        if (parsed.pathname.startsWith("/images/")) {
          image.src = StorageMng.getUrl(parsed.pathname.slice("/images/".length));
        }
      } catch {
        // Leave external/invalid image URLs unchanged.
      }
  }
  return designPlan;
}

router.get("/all-projects", (req, res) => {
 const page = req.query.page ? Number(req.query.page) : 1;
 const pageSize = req.query.pageSize ? Number(req.query.pageSize) : 10;
 try {
  const projects = getAllProjects(page, pageSize);
  return res.json(projects);
 } catch (err) {
  console.error("[GET /all-projects]", err);
  return res.status(500).json({ error: err.message });
 }
});

router.post("/create-project", async (req, res) => {
 try {
  const { name, userDesc, brand: submittedBrand = {}, logoData } = req.body;

  if (!name || !userDesc) {
   return res.status(400).json({
     error: "name and userDesc are required",
   });
  }

  const palette = {};
  for (const key of ["primary", "secondary", "tertiary"]) {
   const value = submittedBrand?.palette?.[key];
   if (value !== undefined && value !== null && String(value).trim()) {
    if (typeof value !== "string" || value.length > 64) {
     return res.status(400).json({ error: `brand.palette.${key} must be text no longer than 64 characters.` });
    }
    palette[key] = value.trim();
   }
  }
  const fonts = {};
  for (const key of ["heading", "body"]) {
   const value = submittedBrand?.fonts?.[key];
   if (value !== undefined && value !== null && String(value).trim()) {
    if (typeof value !== "string" || value.length > 120) {
     return res.status(400).json({ error: `brand.fonts.${key} must be text no longer than 120 characters.` });
    }
    fonts[key] = value.trim();
   }
  }
  const guidance = typeof submittedBrand?.guidance === "string" ? submittedBrand.guidance.trim().slice(0, 4000) : "";
  if (logoData !== undefined && (typeof logoData !== "string" || !logoData.startsWith("data:image/"))) {
   return res.status(400).json({ error: "logoData must be an uploaded image data URL." });
  }

  if (checkProjectNameExists(name)) {
   return res.status(400).json({
     error: "Project name already exists. Try a different name.",
   });
  }

  const settings = getSettings();

  const model = settings.design_model;
  const pexelApiKey = settings.pexel_api;
  const openrouterApiKey = settings.openrouter_api;

  if (!model) {
   return res
    .status(422)
    .json({ error: "Model not set. Please configure a model in settings." });
  }

  if (!pexelApiKey) {
   return res
    .status(422)
    .json({ error: "Pexel API key not set. Please configure a Pexel API key in settings." });
  }

  if (!openrouterApiKey) {
   return res
    .status(422)
    .json({ error: "OpenRouter API key not set. Please configure an OpenRouter API key in settings." });
  }

  const projectId = createProject(name, userDesc);

  try {
    const logoUrl = logoData ? await saveBase64Image(projectId, logoData) : null;
    await designQueue.add("generate-design-plan", {
      projectId,
      userInput: userDesc,
      model,
      brand: {
        ...(Object.keys(palette).length ? { palette } : {}),
        ...(Object.keys(fonts).length ? { fonts } : {}),
        ...(guidance ? { guidance } : {}),
        ...(logoUrl ? { logoUrl } : {}),
      },
    });
  } catch (err) {
    // If the queue add fails, mark the project as failed so the state isn't stuck.
    updateProject(projectId, {
      design_state: "failed",
      design_error: `Failed to enqueue design job: ${err.message}`,
    });
    throw err;
  }

  return res.status(201).json({
   projectId,
   message: "Project created. Design plan generation started.",
  });
 } catch (err) {
  console.error("[POST /create-project]", err);
  return res.status(500).json({ error: err.message });
 }
});

router.get("/project/:id/export/:format", async (req, res) => {
  try {
    const projectId = String(req.params.id).replace(/^proj-/, "");
    const format = String(req.params.format).toLowerCase();
    if (!getProject(projectId)) return res.status(404).json({ error: "Project not found" });
    if (!['pdf', 'pptx'].includes(format)) return res.status(400).json({ error: "format must be pdf or pptx" });
    const buffer = format === 'pdf' ? await exportPdf(projectId) : await exportPptx(projectId);
    res.setHeader('Content-Type', format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', `attachment; filename="presentation.${format}"`);
    return res.send(Buffer.from(buffer));
  } catch (err) {
    console.error(`[GET /project/:id/export/:format]`, err);
    return res.status(500).json({ error: err.message });
  }
});

router.get("/project/:id", (req, res) => {
  try {
    const projectId = req.params.id;
    const project = getProject(projectId);

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    const designState = project.design_state || "pending";
    const slidesState = project.slides_state || "pending";
    const projectName = project.name || "Untitled Project";

    // Design failed but slides never started.
    if (designState === "failed") {
      return res.json({
        projectId: `proj-${projectId}`,
        name: projectName,
        state: "design_failed",
        error: project.design_error || project.error,
        progress: project.progress ?? 0,
        progressMessage: project.progress_message,
      });
    }

    if (designState !== "completed") {
      return res.json({
        projectId: `proj-${projectId}`,
        name: projectName,
        state: designState === "processing" ? "design_processing" : "design_pending",
        message: project.progress_message || "Design plan is being generated.",
        progress: project.progress ?? 0,
        progressMessage: project.progress_message,
      });
    }

    if (designState === "completed" && slidesState === "pending") {
      let designPlan = {};
      try {
        designPlan = project.design_plan
          ? JSON.parse(project.design_plan)
          : {};
      } catch {
        designPlan = {};
      }
      normalizeStoredImageUrls(projectId, designPlan);

      return res.json({
        projectId: `proj-${projectId}`,
        state: "design",
        ...designPlan,
        name: projectName,
      });
    }

    // Design done, slides failed.
    if (slidesState === "failed") {
      return res.json({
        projectId: `proj-${projectId}`,
        name: projectName,
        state: "slides_failed",
        error: project.slides_error || project.error,
        progress: project.progress ?? 0,
        progressMessage: project.progress_message,
      });
    }

    // Design done, slides still processing.
    if (slidesState !== "completed") {
      const slides = getSlidesByProject(projectId)
        .map((s) => {
          const stored = parseStoredSlide(s.html_content);
          if (!stored) return null;
          return {
            index: s.seq_num,
            content: renderSlide(stored, s.seq_num),
          };
        })
        .filter(Boolean);

      return res.json({
        projectId: `proj-${projectId}`,
        name: projectName,
        state: "slides_processing",
        message: project.progress_message || "Slides are being generated.",
        progress: project.progress ?? 0,
        progressMessage: project.progress_message,
        slides,
      });
    }

    // Both done — return rendered HTML.
    const slidesData = getSlidesByProject(projectId);
    const slides = slidesData
      .map((s) => {
        const stored = parseStoredSlide(s.html_content);
        if (!stored) return null;
        return {
          index: s.seq_num,
          content: renderSlide(stored, s.seq_num),
        };
      })
      .filter(Boolean);

    return res.json({
      projectId: `proj-${projectId}`,
      name: projectName,
      state: "generated",
      slides,
    });
  } catch (err) {
    console.error("[GET /project/:id]", err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Decode a base64 data URL and persist it to the local Images directory via
 * StorageMng. Returns the served URL path (e.g. "/images/...").
 */
async function saveBase64Image(projectId, dataUrl) {
  const match = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
  if (!match) {
    throw new Error("Unsupported image data URL.");
  }
  const ext = match[1] === "jpeg" ? "jpg" : match[1];
  const buffer = Buffer.from(match[2], "base64");
  const filename = `proj-${projectId}-${Date.now()}-${crypto
    .randomBytes(4)
    .toString("hex")}.${ext}`;
  await StorageMng.put(filename, buffer);
  return StorageMng.getUrl(filename);
}

/**
 * POST /project/:id/images
 * Accepts a browser image data URL or an external/Pexels URL. External URLs
 * intentionally remain unchanged; uploaded bytes are persisted locally.
 */
router.post("/project/:id/images", async (req, res) => {
  try {
    const projectId = req.params.id;
    if (!getProject(projectId)) return res.status(404).json({ error: "Project not found" });
    const { image, url, purpose = "" } = req.body || {};
    const source = image || url;
    if (typeof source !== "string" || !source.trim()) {
      return res.status(400).json({ error: "image or url is required" });
    }
    const imageUrl = source.startsWith("data:image/")
      ? await saveBase64Image(projectId, source)
      : source.trim();
    if (!imageUrl.startsWith("http://") && !imageUrl.startsWith("https://")) {
      return res.status(400).json({ error: "Image must be a supported data URL or an http(s) URL." });
    }
    return res.status(201).json({ url: imageUrl, purpose, persisted: source.startsWith("data:image/") });
  } catch (err) {
    console.error("[POST /project/:id/images]", err);
    return res.status(400).json({ error: err.message });
  }
});

/**
 * Walk the design plan's slide images and replace any base64 data URL `src`
 * with a locally-stored served URL. Pexels/external URLs are kept as-is.
 */
async function persistDesignPlanImages(projectId, designPlan) {
  if (!designPlan) return designPlan;
  const images = [];
  if (designPlan.masterTemplate?.image) images.push(designPlan.masterTemplate.image);
  for (const slide of designPlan.slides || []) {
    if (Array.isArray(slide.images)) images.push(...slide.images);
  }
  for (const img of images) {
      const src = img && typeof img === "object" ? img.src : img;
      if (typeof src === "string" && src.startsWith("data:image/")) {
        const url = await saveBase64Image(projectId, src);
        if (img && typeof img === "object") {
          img.src = url;
        }
      }
  }
  return designPlan;
}

router.patch("/project/:id/title", (req, res) => {
  try {
    const project = getProject(req.params.id);
    if (!project) return res.status(404).json({ error: "Project not found" });
    const updated = renameProject(req.params.id, req.body?.name ?? req.body?.title);
    return res.json({ projectId: `proj-${updated.id}`, name: updated.name });
  } catch (err) {
    if (err.code === "PROJECT_NAME_EXISTS") return res.status(409).json({ error: err.message, code: err.code });
    return res.status(400).json({ error: err.message });
  }
});

/**
 * Revert (undo) or re-apply (redo) a batch of AI slide edits directly against
 * the stored composed slide, then return the re-rendered content for each
 * touched slide so the frontend can refresh its preview.
 *
 * Each `change` entry: `{ slideNumber, target: "css"|"html", oldCode, newCode }`.
 *  - undo: replace newCode -> oldCode
 *  - redo: replace oldCode -> newCode
 *
 * For a given slide the edits are applied in reverse order on undo (and in
 * forward order on redo) by re-reading the freshly written row each iteration,
 * so multiple edits to the same slide/field compose correctly.
 */
function applyEditReplacement(projectId, changes, direction) {
  const ordered = direction === "undo" ? [...changes].reverse() : changes;
  const rendered = new Map();

  for (const change of ordered) {
    const number = Number(change.slideNumber);
    const target = change.target === "css" ? "css" : change.target === "html" ? "html" : null;
    if (!Number.isInteger(number) || !target) continue;

    // On undo the edit must be reversed; on redo it is re-applied forward.
    const oldCode = direction === "undo" ? change.newCode : change.oldCode;
    const newCode = direction === "undo" ? change.oldCode : change.newCode;
    if (typeof oldCode !== "string" || !oldCode || typeof newCode !== "string") continue;

    const row = getSlidesByProject(projectId).find((r) => r.seq_num === number);
    const stored = row ? parseStoredSlide(row.html_content) : null;
    if (!stored) continue;

    // Only perform the exact, single occurrence replacement so we never corrupt
    // a slide when the code fragment unexpectedly shifted or duplicated.
    const index = stored[target].indexOf(oldCode);
    if (index < 0 || stored[target].indexOf(oldCode, index + 1) >= 0) continue;

    stored[target] =
      stored[target].slice(0, index) + newCode + stored[target].slice(index + oldCode.length);
    const validated = processSlide(stored);
    updateSlide(projectId, number, { html_content: JSON.stringify(validated) });
    rendered.set(number, renderSlide(validated, number));
  }

  return Array.from(rendered, ([slideNumber, content]) => ({ slideNumber, content }));
}

function handleEditHistory(req, res, direction) {
  try {
    const projectId = String(req.params.id).replace(/^proj-/, "");
    if (!getProject(projectId)) return res.status(404).json({ error: "Project not found" });
    const { changes } = req.body || {};
    if (!Array.isArray(changes) || changes.length === 0) {
      return res.status(400).json({ error: "changes is required" });
    }
    const result = applyEditReplacement(projectId, changes, direction);
    return res.json({
      message: direction === "undo" ? "Changes reverted." : "Changes reapplied.",
      changes: result,
    });
  } catch (err) {
    console.error(`[POST /project/:id/edits/${direction}]`, err);
    return res.status(500).json({ error: err.message });
  }
}

/** POST /project/:id/edits/undo — revert the last AI edit batch. */
router.post("/project/:id/edits/undo", (req, res) => handleEditHistory(req, res, "undo"));

/** POST /project/:id/edits/redo — re-apply a previously undone AI edit batch. */
router.post("/project/:id/edits/redo", (req, res) => handleEditHistory(req, res, "redo"));

router.patch("/project/:id", async (req, res) => {
  try {
    const projectId = req.params.id;
    const existing = getProject(projectId);

    if (!existing) {
      return res.status(404).json({ error: "Project not found" });
    }

    const updates = { ...req.body };

    if (updates.name !== undefined) {
      try {
        const renamed = renameProject(projectId, updates.name);
        if (!renamed) return res.status(404).json({ error: "Project not found" });
        delete updates.name;
      } catch (err) {
        if (err.code === "PROJECT_NAME_EXISTS") {
          return res.status(409).json({ error: err.message, code: err.code });
        }
        return res.status(400).json({ error: err.message });
      }
    }

    // When a design plan is being saved, persist any base64 images and store
    // the plan as JSON in the project row.
    if (updates.design_plan && typeof updates.design_plan === "object") {
      // Images are served by this API process, not by the Vite app. Do not
      // derive the public image origin from req.host, which can be 5173 when
      // the request is proxied through the frontend.
      const processed = await persistDesignPlanImages(
        projectId,
        updates.design_plan
      );
      updates.design_plan = JSON.stringify(processed);
    }

    const updatedProject = updateProject(projectId, updates);

    let designPlan = {};
    try {
      designPlan = updatedProject.design_plan
        ? JSON.parse(updatedProject.design_plan)
        : {};
    } catch {
      designPlan = {};
    }
    normalizeStoredImageUrls(projectId, designPlan);

    return res.json({
      projectId: `proj-${projectId}`,
      name: updatedProject.name,
      state: "design",
      ...designPlan,
    });
  } catch (err) {
    console.error("[PATCH /project/:id]", err);
    return res.status(500).json({ error: err.message });
  }
});

router.delete("/project/:id", (req, res) => {
  try {
    const projectId = req.params.id;
    const existing = getProject(projectId);
    if (!existing) {
      return res.status(404).json({ error: "Project not found" });
    }
    deleteProject(projectId);
    return res.json({ message: "Project deleted successfully" });
  } catch (err) {
    console.error("[DELETE /project/:id]", err);
    return res.status(500).json({ error: err.message });
  }
});

router.post("/retry-design", async (req, res) => {
  try {
    const { projectId } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: "projectId is required" });
    }

    const project = getProject(projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const settings = getSettings();
    const model = settings.design_model;
    if (!model) {
      return res
        .status(422)
        .json({ error: "Model not set. Please configure a model in settings." });
    }

    // If already processing, reject the duplicate.
    if (project.design_state === "processing") {
      return res.status(409).json({
        error: "Design plan is already being generated.",
        state: "design_processing",
      });
    }

    const proj = transitionStage(projectId, "design", "processing");
    updateProgress(projectId, 0, "Preparing design plan");
    if (!proj) {
      return res.status(409).json({
        error: `Cannot retry design in state: ${project.design_state}`,
        state: project.design_state,
      });
    }

    try {
      await designQueue.add("generate-design-plan", {
        projectId,
        userInput: project.user_desc,
        model,
      });
    } catch (err) {
      console.error("[POST /retry-design]", err);
      transitionStage(projectId, "design", "failed", err.message);
      return res.status(500).json({ error: err.message });
    }

    return res.json({
      projectId,
      message: "Design plan regeneration started.",
      state: "design_processing",
    });
  } catch (err) {
    console.error("[POST /retry-design]", err);
    return res.status(500).json({ error: err.message });
  }
});

router.post("/start-crafting/:id", async (req, res) => {
  try {
    const projectId = req.params.id;
    const project = getProject(projectId);

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    if (project.design_state !== "completed") {
      return res.status(400).json({
        error: "Design plan is not ready. Please wait for design generation to complete.",
        state: project.design_state,
      });
    }

    const settings = getSettings();
    const pexelApiKey = settings.pexel_api;
    const openrouterApiKey = settings.openrouter_api;

    const model = settings.main_model;
    if (!model) {
      return res
        .status(422)
        .json({ error: "Main model not set. Please configure a model in settings." });
    }

    if (!pexelApiKey) {
      return res
        .status(422)
        .json({ error: "Pexel API key not set. Please configure a Pexel API key in settings." });
    }

    if (!openrouterApiKey) {
      return res
        .status(422)
        .json({ error: "OpenRouter API key not set. Please configure an OpenRouter API key in settings." });
    }

    if (project.slides_state === "processing") {
      return res.status(409).json({
        error: "Slides are already being generated.",
        state: "slides_processing",
      });
    }

    if (project.slides_state === "completed") {
      return res.json({
        projectId: `proj-${projectId}`,
        message: "Slides are already generated.",
        state: "slides_completed",
      });
    }

    // re-validate the design plan in DB before queueing.
    let designPlan = null;
    if (project.design_plan) {
      try {
        designPlan = JSON.parse(project.design_plan);
      } catch {
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
        "Design plan is missing or invalid. Please regenerate the design plan.";
      updateProject(projectId, {
        slides_state: "failed",
        slides_error: errMsg,
        error: errMsg,
      });
      return res.status(400).json({ error: errMsg });
    }

    const proj = transitionStage(projectId, "slides", "processing");
    updateProgress(projectId, 0, "Preparing slide generation");
    if (!proj) {
      return res.status(409).json({
        error: `Cannot start slides in state: ${project.slides_state}`,
        state: project.slides_state,
      });
    }

    try {
      await slidesQueue.add(`generate-slides-${projectId}`, {
        projectId: Number(projectId),
        designPlan: designPlan,
        model: model,
      });
    } catch (err) {
      transitionStage(projectId, "slides", "failed", err.message);

      console.error("[POST /start-crafting/:id]", err);
      return res.status(500).json({ error: err.message });
    }

    return res.json({
      projectId: `proj-${projectId}`,
      message: "Slide generation started.",
      state: "slides_processing",
    });
  } catch (err) {
    console.error("[POST /start-crafting/:id]", err);
    return res.status(500).json({ error: err.message });
  }
});

router.post("/retry-slides/:id", async (req, res) => {
  const { id } = req.params;
  const project = await getProject(id);
  if (!project) {
    return res.status(404).json({ error: "Project not found." });
  }
  if (project.slides_state !== "failed" || project.design_state !== "completed") {
    return res.status(400).json({ error: "Slides are not in failed state or design is not completed." });
  }
  const settings = getSettings();
  const model = settings.main_model;
  const pexelApiKey = settings.pexel_api;
  const openrouterApiKey = settings.openrouter_api;

  if (!model) {
    return res
      .status(422)
      .json({ error: "Main model not set. Please configure a model in settings." });
  }

  if (!pexelApiKey) {
    return res
      .status(422)
      .json({ error: "Pexel API key not set. Please configure a Pexel API key in settings." });
  }

  if (!openrouterApiKey) {
    return res
      .status(422)
      .json({ error: "OpenRouter API key not set. Please configure an OpenRouter API key in settings." });
  }

  let designPlan = null;
  if (project.design_plan) {
    try {
      designPlan = JSON.parse(project.design_plan);
    } catch {
      designPlan = null;
    }
  }
  if (!designPlan) {
    return res.status(422).json({ error: "Design plan is invalid." });
  }
  const proj = transitionStage(id, "slides", "processing");
  updateProgress(id, 0, "Preparing slide generation");
  if (!proj) return res.status(500).json({ error: "Failed to retry slides." });
  try {
    await slidesQueue.add(`generate-slides-${id}`, {
      projectId: Number(id),
      designPlan: designPlan,
      model: model,
    });
  } catch (err) {
    transitionStage(id, "slides", "failed", err.message);
    console.error("[POST /retry-slides/:id]", err);
    return res.status(500).json({ error: err.message });
  }
  return res.json({
    projectId: `proj-${id}`,
    message: "Slide generation started.",
    state: "slides_processing",
  });
});

export default router;
