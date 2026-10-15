import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import indexRoutes from './routes/index.js';
import uploadRoutes from './routes/upload.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const viewsDir = path.resolve(__dirname, '..', 'views');

const app = express();
const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || '127.0.0.1';

// Eta v3 is async-only and resolves templates relative to its `views` root.
// Express calls engines with the absolute file path it looked up; we pass that
// path to Eta by overriding `renderAsync` to read the file directly.
app.engine('eta', async (filePath, options, callback) => {
  try {
    const { readFile } = await import('node:fs/promises');
    const { Eta } = await import('eta');
    const eta = new Eta({ views: viewsDir, cache: false });
    const template = await readFile(filePath, 'utf-8');
    const result = await eta.renderStringAsync(template, options);
    callback(null, result);
  } catch (err) {
    callback(err);
  }
});

app.set('view engine', 'eta');
app.set('views', viewsDir);

app.use(express.static(path.resolve(__dirname, '..', 'public')));

app.use('/', indexRoutes);
app.use('/upload', uploadRoutes);

app.get('/healthz', (_req, res) => {
  res.json({ ok: true });
});

// Bind to localhost only. The upload endpoint has no auth, so exposing the
// app on any network interface would allow anyone who can reach this host to
// overwrite the current month's recipe CSV.
if (process.env.NODE_ENV !== 'test') {
  app.listen(port, host, () => {
    console.log(`budget-webapp listening on http://${host}:${port}`);
  });
}

export default app;
