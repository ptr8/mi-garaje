import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const defaultDbPath = path.resolve(projectRoot, 'data', 'mi-garaje.sqlite');

export async function openDatabase() {
  const configuredPath = process.env.DATABASE_PATH;
  const filename = configuredPath
    ? path.resolve(projectRoot, configuredPath)
    : defaultDbPath;
  await fs.mkdir(path.dirname(filename), { recursive: true });

  const db = await open({
    filename,
    driver: sqlite3.Database,
  });

  await db.exec('PRAGMA foreign_keys = ON');
  await migrate(db);
  return db;
}

async function migrate(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      plate TEXT NOT NULL,
      type TEXT NOT NULL,
      current_km INTEGER NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS itv_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL,
      last_date TEXT NOT NULL,
      next_date TEXT NOT NULL,
      result TEXT NOT NULL,
      price REAL NOT NULL DEFAULT 0,
      observations TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS maintenance_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      km INTEGER NOT NULL DEFAULT 0,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      price REAL NOT NULL DEFAULT 0,
      provider TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    );
  `);
}
