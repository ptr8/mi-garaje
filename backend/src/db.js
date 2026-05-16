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
      brand TEXT NOT NULL DEFAULT '',
      model TEXT NOT NULL DEFAULT '',
      plate TEXT NOT NULL,
      type TEXT NOT NULL,
      vehicle_kind TEXT NOT NULL DEFAULT '',
      itv_category TEXT NOT NULL DEFAULT '',
      registration_date TEXT NOT NULL DEFAULT '',
      insurance_expiry TEXT NOT NULL DEFAULT '',
      insurance_company TEXT NOT NULL DEFAULT '',
      insurance_price REAL NOT NULL DEFAULT 0,
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

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await ensureColumn(db, 'vehicles', 'registration_date', "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, 'vehicles', 'brand', "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, 'vehicles', 'model', "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, 'vehicles', 'vehicle_kind', "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, 'vehicles', 'itv_category', "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, 'vehicles', 'insurance_expiry', "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, 'vehicles', 'insurance_company', "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, 'vehicles', 'insurance_price', "REAL NOT NULL DEFAULT 0");
  await backfillVehicleBrandModel(db);
  await db.run("UPDATE vehicles SET itv_category = type WHERE itv_category = ''");
}

async function ensureColumn(db, table, column, definition) {
  const columns = await db.all(`PRAGMA table_info(${table})`);
  if (!columns.some((item) => item.name === column)) {
    await db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

async function backfillVehicleBrandModel(db) {
  const vehicles = await db.all("SELECT id, name, brand, model FROM vehicles WHERE brand = '' OR model = ''");
  for (const vehicle of vehicles) {
    const parts = String(vehicle.name || '').trim().split(/\s+/);
    const brand = vehicle.brand || parts.shift() || vehicle.name || '';
    const model = vehicle.model || parts.join(' ');
    await db.run('UPDATE vehicles SET brand = ?, model = ? WHERE id = ?', brand, model, vehicle.id);
  }
}
