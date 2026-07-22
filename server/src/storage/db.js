import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(path.resolve(__dirname, "../../app.db"));

// Enable WAL mode for better concurrent reads
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ──────────────────────────────────────────────
// SCHEMA
// ──────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    openrouter_api TEXT DEFAULT '',
    pexel_api TEXT DEFAULT '',
    design_model TEXT DEFAULT '',
    main_model TEXT DEFAULT '',
    small_model TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS project (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    user_desc TEXT NOT NULL DEFAULT '',
    design_plan TEXT DEFAULT NULL,
    design_status BOOLEAN DEFAULT 0 NOT NULL,
    slides_status BOOLEAN DEFAULT 0 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS slides (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    seq_num INTEGER NOT NULL,
    html_content TEXT DEFAULT '',
    images_path TEXT DEFAULT '[]',
    FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE
  );
`);

// Ensure the singleton settings row exists
db.prepare(`
  INSERT OR IGNORE INTO settings (id, openrouter_api, pexel_api, design_model, main_model, small_model)
  VALUES (1, '', '', '', '', '')
`).run();

// ──────────────────────────────────────────────
// SETTINGS HELPERS
// ──────────────────────────────────────────────

export function getSettings() {
  const row = db.prepare("SELECT * FROM settings WHERE id = 1").get();
  if (!row) return null;
  const { id, ...settings } = row;
  return settings;
}

export function updateSettings(data) {
  const allowed = ["openrouter_api", "pexel_api", "design_model", "main_model", "small_model"];
  const sets = [];
  const vals = [];
  for (const key of allowed) {
    if (data[key] !== undefined) {
      sets.push(`${key} = ?`);
      vals.push(data[key]);
    }
  }
  if (sets.length === 0) return getSettings();
  vals.push(1);
  db.prepare(`UPDATE settings SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
  return getSettings();
}

// ──────────────────────────────────────────────
// PROJECT HELPERS
// ──────────────────────────────────────────────

export function createProject(name, userDesc) {
  const stmt = db.prepare(
    "INSERT INTO project (name, user_desc) VALUES (?, ?)"
  );
  const result = stmt.run(name, userDesc);
  return result.lastInsertRowid;
}

export function getProject(id) {
  return db.prepare("SELECT * FROM project WHERE id = ?").get(id);
}

export function updateProject(id, data) {
  const allowed = ["name", "user_desc", "design_plan", "design_status", "slides_status"];
  const sets = [];
  const vals = [];
  for (const key of allowed) {
    if (data[key] !== undefined) {
      sets.push(`${key} = ?`);
      vals.push(data[key]);
    }
  }
  if (sets.length === 0) return getProject(id);
  vals.push(id);
  db.prepare(`UPDATE project SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
  return getProject(id);
}

// ──────────────────────────────────────────────
// SLIDES HELPERS
// ──────────────────────────────────────────────

export function createSlide(projectId, seqNum, htmlContent = "", imagesPath = []) {
  const stmt = db.prepare(
    "INSERT INTO slides (project_id, seq_num, html_content, images_path) VALUES (?, ?, ?, ?)"
  );
  const result = stmt.run(projectId, seqNum, htmlContent, JSON.stringify(imagesPath));
  return result.lastInsertRowid;
}

export function getSlidesByProject(projectId) {
  const rows = db.prepare(
    "SELECT * FROM slides WHERE project_id = ? ORDER BY seq_num ASC"
  ).all(projectId);
  return rows.map(r => ({
    ...r,
    images_path: JSON.parse(r.images_path || "[]"),
  }));
}

export function updateSlide(id, data) {
  const allowed = ["html_content", "images_path"];
  const sets = [];
  const vals = [];
  for (const key of allowed) {
    if (data[key] !== undefined) {
      sets.push(`${key} = ?`);
      vals.push(key === "images_path" ? JSON.stringify(data[key]) : data[key]);
    }
  }
  if (sets.length === 0) return;
  vals.push(id);
  db.prepare(`UPDATE slides SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
}

export default db;