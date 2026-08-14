import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(path.resolve(__dirname, "../../app.db"));

// Enable WAL mode for better concurrent reads
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

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
    design_state TEXT DEFAULT 'pending' NOT NULL,
    slides_state TEXT DEFAULT 'pending' NOT NULL,
    design_error TEXT DEFAULT NULL,
    slides_error TEXT DEFAULT NULL,
    master_template TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (design_state IN ('pending', 'processing', 'completed', 'failed')),
    CHECK (slides_state IN ('pending', 'processing', 'completed', 'failed'))
  );

  CREATE TABLE IF NOT EXISTS slides (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    seq_num INTEGER NOT NULL,
    html_content TEXT DEFAULT '',
    images_path TEXT DEFAULT '[]',
    FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE,
    UNIQUE (project_id, seq_num)
  );
`);

// Enforce title uniqueness at the database boundary as well as in the route.
// The normalized expression keeps "Demo" and " demo " from colliding later.
db.exec("CREATE UNIQUE INDEX IF NOT EXISTS project_name_unique ON project(lower(trim(name)))");

// Progress columns are additive so existing SQLite databases migrate safely.
for (const statement of [
  "ALTER TABLE project ADD COLUMN progress INTEGER DEFAULT 0",
  "ALTER TABLE project ADD COLUMN progress_message TEXT DEFAULT NULL",
]) {
  try {
    db.exec(statement);
  } catch (err) {
    if (!String(err.message).includes("duplicate column name")) throw err;
  }
}

// Singleton settings row
db.prepare(`
  INSERT OR IGNORE INTO settings (id, openrouter_api, pexel_api, design_model, main_model, small_model)
  VALUES (1, '', '', '', '', '')
`).run();

const PROJECT_WRITABLE_COLUMNS = new Set([
  "name",
  "design_plan",
  "design_state",
  "slides_state",
  "design_error",
  "slides_error",
  "master_template",
  "progress",
  "progress_message",
]);

const ALLOWED_STATES = ["pending", "processing", "completed", "failed"];

function ensureState(value) {
  if (!ALLOWED_STATES.includes(value)) {
    throw new Error(`Invalid state: ${value}`);
  }
}

export function updateProgress(projectId, progress, message = null) {
  const bounded = Math.max(0, Math.min(100, Math.round(Number(progress) || 0)));
  db.prepare("UPDATE project SET progress = ?, progress_message = ? WHERE id = ?")
    .run(bounded, message, projectId);
  return getProject(projectId);
}

export function transitionStage(projectId, stage, toState, errorValue = null) {
  ensureState(toState);

  const stateCol = stage === "design" ? "design_state" : "slides_state";
  const errCol = stage === "design" ? "design_error" : "slides_error";
  
  const sql = `UPDATE project SET ${stateCol} = ?, ${errCol} = ? WHERE id = ?`;
  const params = [toState, errorValue, projectId];

  const result = db.prepare(sql).run(...params);
  if (result.changes === 0) return null;
  return getProject(projectId);
}

// Helper functions

export function getSettings() {
  let row = db.prepare("SELECT * FROM settings WHERE id = 1").get();
  if (!row) {
    db.prepare(`
      INSERT INTO settings (id, openrouter_api, pexel_api, design_model, main_model, small_model)
      VALUES (1, '', '', '', '', '')
      `).run();
    row = db.prepare("SELECT * FROM settings WHERE id = 1").get();
  }
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

// ----- Project helpers -----
export function checkProjectNameExists(name, excludeId = null) {
  const normalized = String(name ?? "").trim();
  if (!normalized) return false;
  const query = excludeId == null
    ? "SELECT 1 FROM project WHERE lower(trim(name)) = lower(?) LIMIT 1"
    : "SELECT 1 FROM project WHERE lower(trim(name)) = lower(?) AND id <> ? LIMIT 1";
  const row = excludeId == null
    ? db.prepare(query).get(normalized)
    : db.prepare(query).get(normalized, excludeId);
  return row !== undefined;
}

export function createProject(name, userDesc) {
  const stmt = db.prepare(
    "INSERT INTO project (name, user_desc, design_state, slides_state) VALUES (?, ?, 'processing', 'pending')"
  );
  const result = stmt.run(name, userDesc);
  return result.lastInsertRowid;
}

export function getProject(id) {
  return db.prepare("SELECT * FROM project WHERE id = ?").get(id);
}

export function getAllProjects(page = 1, pageSize = 10) {
  return db
    .prepare(
      `SELECT id, name FROM project ORDER BY created_at DESC LIMIT ? OFFSET ?`
    )
    .all(pageSize, (page - 1) * pageSize);
}

export function renameProject(id, name) {
  const normalized = String(name ?? "").trim();
  if (!normalized) throw new Error("Project name is required.");
  if (checkProjectNameExists(normalized, id)) {
    const error = new Error("Project name already exists. Try a different name.");
    error.code = "PROJECT_NAME_EXISTS";
    throw error;
  }
  const result = db.prepare("UPDATE project SET name = ? WHERE id = ?").run(normalized, id);
  return result.changes ? getProject(id) : null;
}

export function updateProject(id, data) {
  const sets = [];
  const vals = [];
  for (const key of PROJECT_WRITABLE_COLUMNS) {
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

export function deleteProject(id) {
  db.prepare("DELETE FROM project WHERE id = ?").run(id);
}

export function createSlide(projectId, seqNum, htmlContent = "", imagesPath = []) {
  const stmt = db.prepare(
    "INSERT INTO slides (project_id, seq_num, html_content, images_path) VALUES (?, ?, ?, ?)"
  );
  const result = stmt.run(projectId, seqNum, htmlContent, JSON.stringify(imagesPath));
  return result.lastInsertRowid;
}

export function getSlidesByProject(projectId) {
  const rows = db
    .prepare("SELECT * FROM slides WHERE project_id = ? ORDER BY seq_num ASC")
    .all(projectId);
  if (!rows) return [];
  return rows.map((r) => ({
    ...r,
    images_path: JSON.parse(r.images_path || "[]"),
  }));
}

export function updateSlide(projectId, seqNum, data) {
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
  vals.push(projectId, seqNum);
  db.prepare(`UPDATE slides SET ${sets.join(", ")} WHERE project_id = ? AND seq_num = ?`).run(...vals);
}

// export function upsertSlide(projectId, seqNum, htmlContent, imagesPath = []) {
//   const existing = db
//     .prepare("SELECT id FROM slides WHERE project_id = ? AND seq_num = ?")
//     .get(projectId, seqNum);
//   if (existing) {
//     updateSlide(existing.id, { html_content: htmlContent, images_path: imagesPath });
//     return existing.id;
//   }
//   return createSlide(projectId, seqNum, htmlContent, imagesPath);
// }

export default db;
