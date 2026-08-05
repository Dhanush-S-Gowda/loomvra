import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import projectRoutes from "./routes/project.routes.js";
import settingsRoutes from "./routes/settings.routes.js";
import slidesRoutes from "./routes/slides.routes.js";

import getSupportedModels from "./utils/getSupportedModels.js"

// Start background workers
import "./workers/design.worker.js";
import "./workers/slides.worker.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// CORS: allow localhost:5173
app.use(
    cors({
        origin: "http://localhost:5173",
        methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
        credentials: true,
    })
);

app.use(express.json({ limit: "50mb" }));

// Serve Images directory statically so StorageMng.getUrl() paths work
app.use("/images", express.static(path.resolve(__dirname, "../Images")));

// Routes
app.use(projectRoutes);
app.use(settingsRoutes);
app.use(slidesRoutes);

// Health check
app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Get supported models
app.get("/models", async (_req, res) => {
    const models = await getSupportedModels();
    res.json(models);
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});

export default app;
