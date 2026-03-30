import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "bodypet.db");

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      whoop_user_id TEXT UNIQUE NOT NULL,
      access_token TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      token_expires_at INTEGER NOT NULL,
      timezone TEXT DEFAULT 'UTC',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS daily_metrics (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      date TEXT NOT NULL,
      recovery REAL NOT NULL,
      sleep_score REAL NOT NULL,
      strain REAL NOT NULL,
      hrv REAL NOT NULL DEFAULT 0,
      rhr REAL NOT NULL DEFAULT 0,
      fetched_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, date)
    );

    CREATE TABLE IF NOT EXISTS creature_states (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      date TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT 'BodyPet',
      mood TEXT NOT NULL DEFAULT 'neutral',
      evolution_stage TEXT NOT NULL DEFAULT 'egg',
      health_points REAL NOT NULL DEFAULT 50,
      streak_days INTEGER NOT NULL DEFAULT 0,
      is_alive INTEGER NOT NULL DEFAULT 1,
      traits TEXT NOT NULL DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, date)
    );

    CREATE INDEX IF NOT EXISTS idx_metrics_user_date ON daily_metrics(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_creature_user_date ON creature_states(user_id, date);
  `);
}
