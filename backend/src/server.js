import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { openDatabase } from './db.js';
import { createRouter } from './routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });
dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3000);
const db = await openDatabase();

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use('/api', createRouter(db));

const publicDir = path.resolve(__dirname, '..', 'public');
app.use(express.static(publicDir));
app.get('*', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  res.status(status).json({
    error: status === 500 ? 'Error interno del servidor' : error.message,
  });
});

app.listen(port, () => {
  console.log(`Mi Garaje escuchando en http://localhost:${port}`);
});
