import { Router } from "express";
import { getProject, getSlidesByProject } from "../storage/db.js";
import { renderSlide } from "../pipeline/index.js";

const router = Router();

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
            state: "generated",
            slides,
        });
    } catch (err) {
        console.error("[GET /slides/:projectId]", err);
        return res.status(500).json({ error: err.message });
    }
});

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

        if (project.slides_state !== "completed") {
            return res.status(404).json({
                error: "Slides are not yet generated for this project.",
            });
        }

        const slides = getSlidesByProject(projectId);
        const slide = slides.find((s) => s.seq_num === index);

        if (!slide) {
            return res.status(404).json({
                error: `Slide ${index} not found for project ${projectId}`,
            });
        }

        const stored = parseStoredSlide(slide.html_content);
        if (!stored) {
            return res.status(404).json({
                error: `Slide ${index} content is invalid or missing.`,
            });
        }

        return res.json({
            projectId: `proj-${projectId}`,
            index: slide.seq_num,
            content: renderSlide(stored, slide.seq_num),
        });
    } catch (err) {
        console.error("[GET /slides/:projectId/slide/:index]", err);
        return res.status(500).json({ error: err.message });
    }
});

export default router;
