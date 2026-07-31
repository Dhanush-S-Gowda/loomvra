import { Router } from "express";
import { getProject, getSlidesByProject } from "../storage/db.js";

const router = Router();

/**
 * Assemble a slide HTML fragment by injecting it into the master's
 * {{CONTENT}} placeholder. Returns an HTML document with boilerplate.
 */
function assembleSlideHTML(masterTemplate, slideFragment, slideNumber) {
    const slideStyleMatch = slideFragment.match(/<style\b[^>]*>[\s\S]*?<\/style>/i);
    const slideStyle = slideStyleMatch ? slideStyleMatch[0] : "";
    const slideBodyMatch = slideFragment.match(/<div\b[^>]*>[\s\S]*?<\/div>/i);
    const slideBody = slideBodyMatch ? slideBodyMatch[0] : "";

    // Combine the master style + slide style, then replace {{CONTENT}}.
    let slideRoot = masterTemplate;
    const masterStyleIdx = masterTemplate.search(/<style\b[^>]*>[\s\S]*?<\/style>/i);
    if (masterStyleIdx >= 0) {
        const afterStyle = masterTemplate
            .slice(masterStyleIdx)
            .replace(/<\/style>/i, "</style>\n" + slideStyle);
        slideRoot = masterTemplate.slice(0, masterStyleIdx) + afterStyle;
    } else {
        slideRoot = slideStyle + "\n" + masterTemplate;
    }

    slideRoot = slideRoot.replace(/\{\{CONTENT\}\}/g, slideBody);

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=1280, initial-scale=1.0">
  <title>Slide ${slideNumber}</title>
</head>
<body>
${slideRoot}
</body>
</html>`;
}

/**
 * GET /slides/:projectId
 *
 * Returns the slide-generation state for a project.
 *
 * States:
 *   - "not_found"          — project doesn't exist
 *   - "design_pending"     — design plan is not yet ready
 *   - "design_processing"  — design is currently being generated
 *   - "design_failed"      — design stage errored
 *   - "slides_pending"     — slides not yet started
 *   - "slides_processing"  — slides are being generated
 *   - "slides_failed"      — slides stage errored
 *   - "generated"          — slides are ready
 */
router.get("/slides/:projectId", (req, res) => {
    try {
        const projectId = req.params.projectId;
        const project = getProject(projectId);

        if (!project) {
            return res.status(404).json({
                projectId: `proj-${projectId}`,
                state: "not_found",
                error: "Project not found",
            });
        }

        const designState = project.design_state || "pending";
        const slidesState = project.slides_state || "pending";

        if (designState === "failed") {
            return res.json({
                projectId: `proj-${projectId}`,
                state: "design_failed",
                error: project.design_error || project.error,
            });
        }

        if (designState !== "completed") {
            return res.json({
                projectId: `proj-${projectId}`,
                state: designState === "processing" ? "design_processing" : "design_pending",
                message: "Design plan is still being generated.",
            });
        }

        if (slidesState === "failed") {
            return res.json({
                projectId: `proj-${projectId}`,
                state: "slides_failed",
                error: project.slides_error || project.error,
            });
        }

        if (slidesState !== "completed") {
            return res.json({
                projectId: `proj-${projectId}`,
                state: slidesState === "processing" ? "slides_processing" : "slides_pending",
                message: "Slides are being generated.",
            });
        }

        if (!project.master_template) {
            return res.json({
                projectId: `proj-${projectId}`,
                state: "slides_failed",
                error: "Master template is missing. Please retry slide generation.",
            });
        }

        const slidesData = getSlidesByProject(projectId);
        const slides = slidesData.map((s) => ({
            index: s.seq_num,
            content: assembleSlideHTML(project.master_template, s.html_content, s.seq_num),
        }));

        return res.json({
            projectId: `proj-${projectId}`,
            state: "generated",
            masterTemplate: project.master_template,
            slides,
        });
    } catch (err) {
        console.error("[GET /slides/:projectId]", err);
        return res.status(500).json({ error: err.message });
    }
});

/**
 * GET /slides/:projectId/master
 */
router.get("/slides/:projectId/master", (req, res) => {
    try {
        const projectId = req.params.projectId;
        const project = getProject(projectId);

        if (!project) {
            return res.status(404).json({ error: "Project not found" });
        }

        if (!project.master_template) {
            return res.status(404).json({
                error: "Master template not yet generated for this project.",
            });
        }

        return res.json({
            projectId: `proj-${projectId}`,
            masterTemplate: project.master_template,
        });
    } catch (err) {
        console.error("[GET /slides/:projectId/master]", err);
        return res.status(500).json({ error: err.message });
    }
});

/**
 * GET /slides/:projectId/slide/:index
 */
router.get("/slides/:projectId/slide/:index", (req, res) => {
    try {
        const projectId = req.params.projectId;
        const index = Number(req.params.index);

        if (!Number.isFinite(index) || index < 1) {
            return res.status(400).json({ error: "Invalid slide index" });
        }

        const project = getProject(projectId);
        if (!project) {
            return res.status(404).json({ error: "Project not found" });
        }

        if (!project.master_template) {
            return res.status(404).json({
                error: "Master template not yet generated for this project.",
            });
        }

        const slides = getSlidesByProject(projectId);
        const slide = slides.find((s) => s.seq_num === index);

        if (!slide) {
            return res.status(404).json({
                error: `Slide ${index} not found for project ${projectId}`,
            });
        }

        return res.json({
            projectId: `proj-${projectId}`,
            index: slide.seq_num,
            content: assembleSlideHTML(project.master_template, slide.html_content, slide.seq_num),
        });
    } catch (err) {
        console.error("[GET /slides/:projectId/slide/:index]", err);
        return res.status(500).json({ error: err.message });
    }
});

export default router;
