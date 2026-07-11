import Database from "better-sqlite3";

const db = new Database("app.db");

db.prepare(
    `
    CREATE TABLE IF NOT EXISTS projects(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      plan_comp BOOLEAN DEFAULT FALSE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      exported_at TIMESTAMP,
    )
    `
)

export default db;
