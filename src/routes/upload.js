import { Router } from 'express';
import multer from 'multer';
import { extname } from 'node:path';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseRecipeCsv } from '../lib/csv.js';
import { ingestCache } from '../lib/cache.js';

const router = Router();

// Security: no auth on this upload endpoint. The whole app must therefore bind
// to 127.0.0.1 only (see src/server.js). The 1 MB file size limit below is
// the only other defense if someone already has access to the same machine.
// TODO: auth — add HTTP basic auth behind an env var, or put the app behind a
// reverse proxy that terminates auth, before exposing this endpoint beyond localhost.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1 * 1024 * 1024 }, // 1 MB
});

const EXPECTED_HEADERS = [
  'Date',
  'Store',
  'Category',
  'Item',
  'Price',
  'Currency',
  'Rate',
  'OriginalPrice',
];

const FILENAME_RE = /^recipes_\d{4}-\d{2}\.csv$/;

/**
 * Validate an uploaded recipe CSV buffer and return either a success object
 * with the target month, or an error object with a message for the user.
 * @param {{ originalname: string, mimetype: string, buffer: Buffer }} file
 * @returns {{ ok: true, month: string } | { ok: false, message: string }}
 */
export function validateUpload(file) {
  if (!FILENAME_RE.test(file.originalname)) {
    return { ok: false, message: `filename must match recipes_YYYY-MM.csv (got ${file.originalname})` };
  }

  if (file.mimetype !== 'text/csv') {
    return { ok: false, message: `Content-Type must be text/csv (got ${file.mimetype})` };
  }

  const text = file.buffer.toString('utf-8');
  const { headers } = parseRecipeCsv(text);

  const missing = EXPECTED_HEADERS.filter((h) => !headers.includes(h));
  if (missing.length > 0) {
    return { ok: false, message: `missing required column(s): ${missing.join(', ')}` };
  }

  const month = extname(file.originalname)
    ? file.originalname.slice(0, -extname(file.originalname).length)
    : file.originalname;

  return { ok: true, month };
}

router.get('/', (_req, res) => {
  return res.render('upload', {
    title: 'Upload recipe CSV',
    error: null,
  });
});

router.post('/', upload.single('recipe'), async (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).render('upload', {
      title: 'Upload recipe CSV',
      error: 'No file uploaded',
    });
  }

  const result = validateUpload(file);
  if (!result.ok) {
    return res.status(400).render('upload', {
      title: 'Upload recipe CSV',
      error: result.message,
    });
  }

  const recipesDir = process.env.RECIPES_DIR || '/home/master/finance/recipes';
  const targetPath = path.join(recipesDir, `${result.month}.csv`);

  await writeFile(targetPath, file.buffer);

  // Clear cached ingest data so the next request to /spending picks up the new file.
  ingestCache.clear();

  return res.redirect('/spending');
});

export default router;
