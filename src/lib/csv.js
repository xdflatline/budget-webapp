import { readdir } from 'node:fs/promises';
import { parse } from 'csv-parse/sync';

const RECIPE_FILE_RE = /^recipes_\d{4}-\d{2}\.csv$/;

/**
 * Find recipe CSV files in a directory.
 * Only files matching `recipes_YYYY-MM.csv` are returned, sorted ascending.
 * @param {string} dir
 * @returns {Promise<string[]>}
 */
export async function listRecipeFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && RECIPE_FILE_RE.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

/**
 * Parse recipe CSV text.
 * Returns headers and rows with Price/OriginalPrice cast to numbers when possible.
 * @param {string} text
 * @returns {{ headers: string[], rows: Record<string, any>[] }}
 */
export function parseRecipeCsv(text) {
  const records = parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });

  const headers = records.length > 0 ? Object.keys(records[0]) : [];
  const rows = records.map((row) => {
    const out = { ...row };
    for (const key of ['Price', 'OriginalPrice']) {
      if (key in out && out[key] !== '') {
        const parsed = Number(out[key]);
        if (!Number.isNaN(parsed)) {
          out[key] = parsed;
        }
      }
    }
    return out;
  });

  return { headers, rows };
}
