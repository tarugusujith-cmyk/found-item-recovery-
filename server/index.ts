// Production server: serves the built React app and the JSON Server API from one process.
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import jsonServer from 'json-server';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const seed = path.join(root, 'db.json');
const dbPath = process.env.DB_PATH || seed;

// If DB_PATH points to a fresh disk, copy the seed data there first.
if (dbPath !== seed && !fs.existsSync(dbPath)) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  fs.copyFileSync(seed, dbPath);
}

const app = jsonServer.create();
app.use(jsonServer.defaults({ static: dist, logger: false }));
app.use('/api', jsonServer.router(dbPath));
app.get('*', (_req: unknown, res: { sendFile: (file: string) => void }) => res.sendFile(path.join(dist, 'index.html')));

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => console.log(`Lost & Found running on port ${port}`));
