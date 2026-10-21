import { Router } from "express";
import { getSettings, updateSettings } from "../storage/db.js";

const router = Router();

router.get("/settings", (req, res) => {
    try {
        const settings = getSettings();
        if (!settings) {
            return res.status(404).json({ error: "Settings not found" });
        }
        return res.json(settings);
    } catch (err) {
        console.error("[GET /settings]", err);
        return res.status(500).json({ error: err.message });
    }
});

router.patch("/settings", (req, res) => {
    try {
        const updated = updateSettings(req.body);
        return res.json(updated);
    } catch (err) {
        console.error("[PATCH /settings]", err);
        return res.status(500).json({ error: err.message });
    }
});

router.post("/settings/verify/openrouter", async (req, res) => {
    try {
        const { apiKey } = req.body;
        if (!apiKey) {
            return res.status(400).json({ error: "OpenRouter API key is required" });
        }

        const response = await fetch("https://openrouter.ai/api/v1/auth/key", {
            headers: { Authorization: `Bearer ${apiKey}` },
        });

        if (!response.ok) {
            return res.status(401).json({ error: "Invalid OpenRouter API key" });
        }

        return res.json({ valid: true });
    } catch (err) {
        console.error("[POST /settings/verify/openrouter]", err);
        return res.status(500).json({ error: err.message });
    }
});

router.post("/settings/verify/pexels", async (req, res) => {
    try {
        const { apiKey } = req.body;
        if (!apiKey) {
            return res.status(400).json({ error: "Pexels API key is required" });
        }

        const url = new URL("https://api.pexels.com/v1/search");
        url.searchParams.set("query", "test");
        url.searchParams.set("per_page", "1");

        const response = await fetch(url.toString(), {
            headers: { Authorization: apiKey },
        });

        if (!response.ok) {
            return res.status(401).json({ error: "Invalid Pexels API key" });
        }

        return res.json({ valid: true });
    } catch (err) {
        console.error("[POST /settings/verify/pexels]", err);
        return res.status(500).json({ error: err.message });
    }
});

export default router;
