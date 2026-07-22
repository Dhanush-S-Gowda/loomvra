import { Router } from "express";
import {
    createProject,
    getProject,
    updateProject,
    getSlidesByProject,
} from "../storage/db.js";
import { getSettings } from "../storage/db.js";
import designQueue from "../queues/design.queue.js";
import slidesQueue from "../queues/slides.queue.js";

const router = Router();

// ──────────────────────────────────────────────
// POST /create-project
// ──────────────────────────────────────────────
router.post("/create-project", async (req, res) => {
    try {
        const { name, userDesc } = req.body;

        if (!name || !userDesc) {
            return res.status(400).json({ error: "name and userDesc are required" });
        }

        // Insert project into database
        const projectId = createProject(name, userDesc);

        // Get settings for model selection
        const settings = getSettings();
        const model = settings?.design_model || "deepseek/deepseek-v4-flash";

        // Start background job for design plan generation
        await designQueue.add("generate-design-plan", {
            projectId,
            userInput: userDesc,
            model,
        });

        return res.status(201).json({
            projectId,
            message: "Project created. Design plan generation started.",
        });
    } catch (err) {
        console.error("[POST /create-project]", err);
        return res.status(500).json({ error: err.message });
    }
});

// ──────────────────────────────────────────────
// GET /project/:id
// ──────────────────────────────────────────────
router.get("/project/:id", (req, res) => {
    try {
        const projectId = req.params.id;
        const project = getProject(projectId);

        if (!project) {
            return res.status(404).json({ error: "Project not found" });
        }

        // Parse design plan
        let designPlan = {};
        try {
            designPlan = project.design_plan ? JSON.parse(project.design_plan) : {};
        } catch {
            designPlan = {};
        }

        // Check if both design and slides are complete
        const designComplete = Boolean(project.design_status);
        const slidesComplete = Boolean(project.slides_status);

        if (designComplete && slidesComplete) {
            // Both done → return slides
            const slidesData = getSlidesByProject(projectId);
            const slides = slidesData.map((s) => ({
                index: s.seq_num,
                content: s.html_content,
            }));

            return res.json({
                projectId: `proj-${projectId}`,
                state: "generated",
                slides,
            });
        }

        if (designComplete) {
            // Only design done → return design plan with injected keys
            // Transform images to just a list of URLs from 'src'
            if (designPlan.slides) {
                for (const slide of designPlan.slides) {
                    if (slide.images && Array.isArray(slide.images)) {
                        slide.images = slide.images.map((img) => img.src || "").filter(Boolean);
                    }
                }
            }

            return res.json({
                projectId: `proj-${projectId}`,
                state: "design",
                ...designPlan,
            });
        }

        // Design still in progress
        return res.json({
            projectId: `proj-${projectId}`,
            state: "processing",
            message: "Design plan is being generated. Please check back later.",
        });
    } catch (err) {
        console.error("[GET /project/:id]", err);
        return res.status(500).json({ error: err.message });
    }
});

// ──────────────────────────────────────────────
// PATCH /project/:id
// ──────────────────────────────────────────────
router.patch("/project/:id", (req, res) => {
    try {
        const projectId = req.params.id;
        const existing = getProject(projectId);

        if (!existing) {
            return res.status(404).json({ error: "Project not found" });
        }

        const updatedProject = updateProject(projectId, req.body);

        let designPlan = {};
        try {
            designPlan = updatedProject.design_plan ? JSON.parse(updatedProject.design_plan) : {};
        } catch {
            designPlan = {};
        }

        return res.json({
            projectId: `proj-${projectId}`,
            state: "design",
            ...designPlan,
        });
    } catch (err) {
        console.error("[PATCH /project/:id]", err);
        return res.status(500).json({ error: err.message });
    }
});

// ──────────────────────────────────────────────
// POST /start-crafting/:id
// ──────────────────────────────────────────────
router.post("/start-crafting/:id", async (req, res) => {
    try {
        const projectId = req.params.id;
        const project = getProject(projectId);

        if (!project) {
            return res.status(404).json({ error: "Project not found" });
        }

        if (!project.design_status) {
            return res.status(400).json({
                error: "Design plan is not ready yet. Please wait for design generation to complete.",
            });
        }

        // Queue the slides generation job
        await slidesQueue.add("generate-slides", {
            projectId: Number(projectId),
        });

        return res.json({
            projectId: `proj-${projectId}`,
            message: "Slide generation started.",
        });
    } catch (err) {
        console.error("[POST /start-crafting/:id]", err);
        return res.status(500).json({ error: err.message });
    }
});

export default router;