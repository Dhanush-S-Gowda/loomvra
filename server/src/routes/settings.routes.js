import { Router } from "express";
import { getSettings, updateSettings } from "../storage/db.js";

const router = Router();

// ──────────────────────────────────────────────
// GET /settings
// ──────────────────────────────────────────────
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

// ──────────────────────────────────────────────
// PATCH /settings
// ──────────────────────────────────────────────
router.patch("/settings", (req, res) => {
    try {
        const updated = updateSettings(req.body);
        return res.json(updated);
    } catch (err) {
        console.error("[PATCH /settings]", err);
        return res.status(500).json({ error: err.message });
    }
});

export default router;