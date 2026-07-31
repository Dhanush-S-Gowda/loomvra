import { Router } from "express";
import {
    createProject,
    getProject,
    updateProject,
    deleteProject,
    getSlidesByProject,
    getAllProjects,
    checkProjectNameExists,
    getSettings,
    transitionStage,
} from "../storage/db.js";
import designQueue from "../queues/design.queue.js";
import slidesQueue from "../queues/slides.queue.js";

const router = Router();

/**
 * Assemble a slide HTML fragment by injecting it into the master's
 * {{CONTENT}} placeholder. Returns an HTML document with boilerplate.
 */
function assembleSlideHTML(masterTemplate, slideFragment, slideNumber) {
    const masterStyleMatch = masterTemplate.match(/<style\b[^>]*>[\s\S]*?<\/style>/i);
    const masterStyle = masterStyleMatch ? masterStyleMatch[0] : "";
    const slideStyleMatch = slideFragment.match(/<style\b[^>]*>[\s\S]*?<\/style>/i);
    const slideStyle = slideStyleMatch ? slideStyleMatch[0] : "";
    const slideBodyMatch = slideFragment.match(/<div\b[^>]*>[\s\S]*?<\/div>/i);
    const slideBody = slideBodyMatch ? slideBodyMatch[0] : "";

    // Build the slide root: take everything after the master style, then
    // replace {{CONTENT}} with the slide's body.
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
        const { name, userDesc } = req.body;

        if (!name || !userDesc) {
            return res.status(400).json({
                error: "name and userDesc are required",
            });
        }

        if (checkProjectNameExists(name)) {
            return res.status(400).json({
                error: "Project name already exists. Try a different name.",
            });
        }

        const settings = getSettings();

        const model = settings.design_model;
        if (!model) {
            return res
                .status(422)
                .json({ error: "Model not set. Please configure a model in settings." });
        }

        // Create project
        const projectId = createProject(name, userDesc);

        try {
            await designQueue.add("generate-design-plan", {
                projectId,
                userInput: userDesc,
                model,
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

router.get("/project/:id", (req, res) => {
    try {
        const projectId = req.params.id;
        const project = getProject(projectId);

        if (!project) {
            return res.status(404).json({ error: "Project not found" });
        }
        const designState = project.design_state || "pending";
        const slidesState = project.slides_state || "pending";

        // Design failed but slides never started.
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
                message: "Design plan is being generated.",
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

            return res.json({
                projectId: `proj-${projectId}`,
                state: "design",
                ...designPlan,
            });
        }

        // Design done, slides failed.
        if (slidesState === "failed") {
            return res.json({
                projectId: `proj-${projectId}`,
                state: "slides_failed",
                error: project.slides_error || project.error,
            });
        }

        // Design done, slides still processing.
        if (slidesState !== "completed") {
            return res.json({
                projectId: `proj-${projectId}`,
                state: "slides_processing",
                message: "Slides are being generated.",
            });
        }

        // Both done — return assembled HTML.
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
            slides,
        });
    } catch (err) {
        console.error("[GET /project/:id]", err);
        return res.status(500).json({ error: err.message });
    }
});

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
            designPlan = updatedProject.design_plan
                ? JSON.parse(updatedProject.design_plan)
                : {};
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
        const model = settings.main_model;
        if (!model) {
            return res
                .status(422)
                .json({ error: "Main model not set. Please configure a model in settings." });
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

        try {
            await slidesQueue.add(`generate-slides-${projectId}`, {
                projectId: Number(projectId),
                designPlan: designPlan,
                model: model,
            });
            const proj = transitionStage(projectId, "slides", "processing");
            if (!proj) {
                return res.status(409).json({
                    error: `Cannot start slides in state: ${project.slides_state}`,
                    state: project.slides_state,
                });
            }
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
    if (!model) {
        return res
            .status(422)
            .json({ error: "Main model not set. Please configure a model in settings." });
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
    try {
        await slidesQueue.add(`generate-slides-${id}`, {
            projectId: Number(id),
            designPlan: designPlan,
            model: model,
        });
        const proj = transitionStage(id, "slides", "processing");
        if (!proj) {
            return res.status(500).json({ error: "Failed to retry slides." });
        }
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
