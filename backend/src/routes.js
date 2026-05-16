import express from 'express';

const vehicleFields = ['brand', 'model', 'plate', 'registration_date', 'current_km', 'notes', 'insurance_expiry', 'insurance_company', 'insurance_price'];
const itvFields = ['vehicle_id', 'last_date', 'next_date', 'result', 'price', 'observations'];
const maintenanceFields = ['vehicle_id', 'date', 'km', 'category', 'description', 'price', 'provider', 'notes'];

export function createRouter(db) {
  const router = express.Router();

  router.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  router.get('/settings/:key', async (req, res, next) => {
    try {
      const row = await db.get('SELECT value FROM app_settings WHERE key = ?', req.params.key);
      res.json({ key: req.params.key, value: row ? JSON.parse(row.value) : null });
    } catch (error) {
      next(error);
    }
  });

  router.put('/settings/:key', async (req, res, next) => {
    try {
      const value = JSON.stringify(req.body?.value ?? null);
      await db.run(
        `INSERT INTO app_settings (key, value, updated_at)
         VALUES (?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
        req.params.key,
        value,
      );
      res.json({ key: req.params.key, value: JSON.parse(value) });
    } catch (error) {
      next(error);
    }
  });

  router.get('/vehicles', async (_req, res, next) => {
    try {
      const rows = await db.all('SELECT * FROM vehicles ORDER BY name COLLATE NOCASE');
      res.json(rows);
    } catch (error) {
      next(error);
    }
  });

  router.post('/vehicles', async (req, res, next) => {
    try {
      const vehicle = normalizeVehicle(req.body);
      const result = await db.run(
        `INSERT INTO vehicles (name, brand, model, plate, type, vehicle_kind, itv_category, registration_date, insurance_expiry, insurance_company, insurance_price, current_km, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        vehicle.name,
        vehicle.brand,
        vehicle.model,
        vehicle.plate,
        vehicle.type,
        vehicle.vehicle_kind,
        vehicle.itv_category,
        vehicle.registration_date,
        vehicle.insurance_expiry,
        vehicle.insurance_company,
        vehicle.insurance_price,
        vehicle.current_km,
        vehicle.notes,
      );
      res.status(201).json(await db.get('SELECT * FROM vehicles WHERE id = ?', result.lastID));
    } catch (error) {
      next(error);
    }
  });

  router.put('/vehicles/:id', async (req, res, next) => {
    try {
      const vehicle = normalizeVehicle(req.body);
      await ensureExists(db, 'vehicles', req.params.id);
      await db.run(
        `UPDATE vehicles
         SET name = ?, brand = ?, model = ?, plate = ?, type = ?, vehicle_kind = ?, itv_category = ?, registration_date = ?,
             insurance_expiry = ?, insurance_company = ?, insurance_price = ?, current_km = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        vehicle.name,
        vehicle.brand,
        vehicle.model,
        vehicle.plate,
        vehicle.type,
        vehicle.vehicle_kind,
        vehicle.itv_category,
        vehicle.registration_date,
        vehicle.insurance_expiry,
        vehicle.insurance_company,
        vehicle.insurance_price,
        vehicle.current_km,
        vehicle.notes,
        req.params.id,
      );
      res.json(await db.get('SELECT * FROM vehicles WHERE id = ?', req.params.id));
    } catch (error) {
      next(error);
    }
  });

  router.delete('/vehicles/:id', async (req, res, next) => {
    try {
      await ensureExists(db, 'vehicles', req.params.id);
      await db.run('DELETE FROM vehicles WHERE id = ?', req.params.id);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  router.get('/itv', async (_req, res, next) => {
    try {
      const rows = await db.all(`
        SELECT i.*, v.name AS vehicle_name, v.brand AS vehicle_brand, v.model AS vehicle_model,
               v.plate AS vehicle_plate, v.type AS vehicle_type, v.vehicle_kind, v.itv_category,
               v.notes AS vehicle_notes
        FROM itv_records i
        JOIN vehicles v ON v.id = i.vehicle_id
        ORDER BY i.next_date ASC
      `);
      res.json(rows);
    } catch (error) {
      next(error);
    }
  });

  router.post('/itv', async (req, res, next) => {
    try {
      const record = normalizeItv(req.body);
      await ensureExists(db, 'vehicles', record.vehicle_id);
      const result = await db.run(
        `INSERT INTO itv_records (vehicle_id, last_date, next_date, result, price, observations)
         VALUES (?, ?, ?, ?, ?, ?)`,
        record.vehicle_id,
        record.last_date,
        record.next_date,
        record.result,
        record.price,
        record.observations,
      );
      res.status(201).json(await getItv(db, result.lastID));
    } catch (error) {
      next(error);
    }
  });

  router.put('/itv/:id', async (req, res, next) => {
    try {
      const record = normalizeItv(req.body);
      await ensureExists(db, 'itv_records', req.params.id);
      await ensureExists(db, 'vehicles', record.vehicle_id);
      await db.run(
        `UPDATE itv_records
         SET vehicle_id = ?, last_date = ?, next_date = ?, result = ?, price = ?, observations = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        record.vehicle_id,
        record.last_date,
        record.next_date,
        record.result,
        record.price,
        record.observations,
        req.params.id,
      );
      res.json(await getItv(db, req.params.id));
    } catch (error) {
      next(error);
    }
  });

  router.delete('/itv/:id', async (req, res, next) => {
    try {
      await ensureExists(db, 'itv_records', req.params.id);
      await db.run('DELETE FROM itv_records WHERE id = ?', req.params.id);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  router.get('/maintenance', async (_req, res, next) => {
    try {
      const rows = await db.all(`
        SELECT m.*, v.name AS vehicle_name, v.brand AS vehicle_brand, v.model AS vehicle_model,
               v.plate AS vehicle_plate, v.type AS vehicle_type, v.vehicle_kind, v.itv_category,
               v.notes AS vehicle_notes
        FROM maintenance_records m
        JOIN vehicles v ON v.id = m.vehicle_id
        ORDER BY m.date DESC, m.id DESC
      `);
      res.json(rows);
    } catch (error) {
      next(error);
    }
  });

  router.post('/maintenance', async (req, res, next) => {
    try {
      const record = normalizeMaintenance(req.body);
      await ensureExists(db, 'vehicles', record.vehicle_id);
      const result = await db.run(
        `INSERT INTO maintenance_records
         (vehicle_id, date, km, category, description, price, provider, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        record.vehicle_id,
        record.date,
        record.km,
        record.category,
        record.description,
        record.price,
        record.provider,
        record.notes,
      );
      res.status(201).json(await getMaintenance(db, result.lastID));
    } catch (error) {
      next(error);
    }
  });

  router.put('/maintenance/:id', async (req, res, next) => {
    try {
      const record = normalizeMaintenance(req.body);
      await ensureExists(db, 'maintenance_records', req.params.id);
      await ensureExists(db, 'vehicles', record.vehicle_id);
      await db.run(
        `UPDATE maintenance_records
         SET vehicle_id = ?, date = ?, km = ?, category = ?, description = ?, price = ?,
             provider = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        record.vehicle_id,
        record.date,
        record.km,
        record.category,
        record.description,
        record.price,
        record.provider,
        record.notes,
        req.params.id,
      );
      res.json(await getMaintenance(db, req.params.id));
    } catch (error) {
      next(error);
    }
  });

  router.delete('/maintenance/:id', async (req, res, next) => {
    try {
      await ensureExists(db, 'maintenance_records', req.params.id);
      await db.run('DELETE FROM maintenance_records WHERE id = ?', req.params.id);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  router.get('/dashboard', async (_req, res, next) => {
    try {
      const upcomingItv = await db.all(`
        SELECT i.*, v.name AS vehicle_name, v.brand AS vehicle_brand, v.model AS vehicle_model,
               v.plate AS vehicle_plate, v.type AS vehicle_type, v.vehicle_kind, v.itv_category,
               v.notes AS vehicle_notes
        FROM itv_records i
        JOIN vehicles v ON v.id = i.vehicle_id
        ORDER BY i.next_date ASC
        LIMIT 3
      `);
      const upcomingInsurance = await db.all(`
        SELECT id AS vehicle_id, name AS vehicle_name, brand AS vehicle_brand, model AS vehicle_model,
               plate AS vehicle_plate, type AS vehicle_type, vehicle_kind, itv_category,
               notes AS vehicle_notes, insurance_expiry, insurance_company, insurance_price
        FROM vehicles
        WHERE insurance_expiry <> ''
        ORDER BY insurance_expiry ASC
        LIMIT 3
      `);
      const latestMaintenance = await db.all(`
        SELECT m.*, v.name AS vehicle_name, v.brand AS vehicle_brand, v.model AS vehicle_model,
               v.plate AS vehicle_plate, v.type AS vehicle_type, v.vehicle_kind, v.itv_category,
               v.notes AS vehicle_notes
        FROM maintenance_records m
        JOIN vehicles v ON v.id = m.vehicle_id
        ORDER BY m.date DESC, m.id DESC
        LIMIT 3
      `);
      const totals = await db.get(`
        SELECT
          (SELECT COALESCE(SUM(price), 0) FROM maintenance_records) +
          (SELECT COALESCE(SUM(price), 0) FROM itv_records) AS total_spent
      `);
      res.json({ upcomingItv, upcomingInsurance, latestMaintenance, totalSpent: Number(totals.total_spent || 0) });
    } catch (error) {
      next(error);
    }
  });

  router.get('/stats', async (_req, res, next) => {
    try {
      const byVehicle = await db.all(`
        SELECT v.name AS name, COALESCE(SUM(x.price), 0) AS total
        FROM vehicles v
        LEFT JOIN (
          SELECT vehicle_id, price FROM maintenance_records
          UNION ALL
          SELECT vehicle_id, price FROM itv_records
        ) x ON x.vehicle_id = v.id
        GROUP BY v.id
        ORDER BY total DESC
      `);
      const byCategory = await db.all(`
        SELECT category AS name, SUM(total) AS total
        FROM (
          SELECT category, SUM(price) AS total FROM maintenance_records GROUP BY category
          UNION ALL
          SELECT 'ITV' AS category, SUM(price) AS total FROM itv_records
        )
        WHERE total IS NOT NULL
        GROUP BY category
        ORDER BY total DESC
      `);
      const monthly = await db.all(`
        SELECT month, SUM(total) AS total
        FROM (
          SELECT strftime('%Y-%m', date) AS month, SUM(price) AS total
          FROM maintenance_records
          GROUP BY month
          UNION ALL
          SELECT strftime('%Y-%m', last_date) AS month, SUM(price) AS total
          FROM itv_records
          GROUP BY month
        )
        WHERE month IS NOT NULL
        GROUP BY month
        ORDER BY month ASC
      `);
      res.json({ byVehicle, byCategory, monthly });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

function normalizeVehicle(body) {
  requireFields(body, vehicleFields.slice(0, 4));
  const brand = String(body.brand ?? '').trim();
  const model = String(body.model ?? '').trim();
  const name = [brand, model].filter(Boolean).join(' ');
  const itvCategory = String(body.itv_category ?? body.type ?? '').trim();
  const vehicleKind = String(body.vehicle_kind ?? '').trim();
  return {
    name: name || String(body.name ?? '').trim(),
    brand,
    model,
    plate: String(body.plate).trim().toUpperCase(),
    type: itvCategory,
    vehicle_kind: vehicleKind,
    itv_category: itvCategory,
    registration_date: cleanDate(body.registration_date),
    insurance_expiry: cleanOptionalDate(body.insurance_expiry),
    insurance_company: cleanText(body.insurance_company),
    insurance_price: toMoney(body.insurance_price),
    current_km: toInteger(body.current_km),
    notes: cleanText(body.notes),
  };
}

function normalizeItv(body) {
  requireFields(body, itvFields.slice(0, 4));
  return {
    vehicle_id: toInteger(body.vehicle_id),
    last_date: cleanDate(body.last_date),
    next_date: cleanDate(body.next_date),
    result: String(body.result).trim(),
    price: toMoney(body.price),
    observations: cleanText(body.observations),
  };
}

function normalizeMaintenance(body) {
  requireFields(body, maintenanceFields.slice(0, 5));
  return {
    vehicle_id: toInteger(body.vehicle_id),
    date: cleanDate(body.date),
    km: toInteger(body.km),
    category: String(body.category).trim(),
    description: String(body.description).trim(),
    price: toMoney(body.price),
    provider: cleanText(body.provider),
    notes: cleanText(body.notes),
  };
}

function requireFields(body, fields) {
  const missing = fields.filter((field) => body[field] === undefined || String(body[field]).trim() === '');
  if (missing.length > 0) {
    const error = new Error(`Faltan campos obligatorios: ${missing.join(', ')}`);
    error.status = 400;
    throw error;
  }
}

function cleanText(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function cleanDate(value) {
  const date = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const error = new Error('La fecha debe usar el formato YYYY-MM-DD');
    error.status = 400;
    throw error;
  }
  return date;
}

function cleanOptionalDate(value) {
  if (value === undefined || value === null || String(value).trim() === '') return '';
  return cleanDate(value);
}

function toInteger(value) {
  const number = Number.parseInt(value ?? 0, 10);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function toMoney(value) {
  const number = Number.parseFloat(value ?? 0);
  return Number.isFinite(number) && number >= 0 ? Math.round(number * 100) / 100 : 0;
}

async function ensureExists(db, table, id) {
  const row = await db.get(`SELECT id FROM ${table} WHERE id = ?`, id);
  if (!row) {
    const error = new Error('Registro no encontrado');
    error.status = 404;
    throw error;
  }
}

function getItv(db, id) {
  return db.get(`
    SELECT i.*, v.name AS vehicle_name, v.brand AS vehicle_brand, v.model AS vehicle_model,
           v.plate AS vehicle_plate, v.type AS vehicle_type, v.vehicle_kind, v.itv_category,
           v.notes AS vehicle_notes
    FROM itv_records i
    JOIN vehicles v ON v.id = i.vehicle_id
    WHERE i.id = ?
  `, id);
}

function getMaintenance(db, id) {
  return db.get(`
    SELECT m.*, v.name AS vehicle_name, v.brand AS vehicle_brand, v.model AS vehicle_model,
           v.plate AS vehicle_plate, v.type AS vehicle_type, v.vehicle_kind, v.itv_category,
           v.notes AS vehicle_notes
    FROM maintenance_records m
    JOIN vehicles v ON v.id = m.vehicle_id
    WHERE m.id = ?
  `, id);
}
