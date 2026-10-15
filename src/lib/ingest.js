import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { parseRecipeCsv } from './csv.js';

const RECIPE_FILE_RE = /^recipes_(\d{4})-(\d{2})\.csv$/;

const cache = new Map();

function isValidMonth(year, month) {
  const m = Number(month);
  return m >= 1 && m <= 12;
}

/**
 * Extract YYYY-MM from a recipe filename.
 * @param {string} name
 * @returns {string | null}
 */
export function monthFromFilename(name) {
  const match = RECIPE_FILE_RE.exec(name);
  if (!match) return null;
  const [, year, month] = match;
  if (!isValidMonth(year, month)) return null;
  return `${year}-${month}`;
}

function sortByMonth(a, b) {
  return a.month.localeCompare(b.month);
}

function chfAmount(row) {
  const price = Number(row.Price);
  if (Number.isNaN(price)) return 0;
  const rate = Number(row.Rate);
  return Number.isNaN(rate) || rate === 0 ? price : price * rate;
}

function topEntry(map) {
  let bestKey = null;
  let bestValue = -Infinity;
  for (const [key, value] of Object.entries(map)) {
    if (value > bestValue) {
      bestKey = key;
      bestValue = value;
    }
  }
  return bestKey ? { key: bestKey, value: bestValue } : null;
}

/**
 * Read and aggregate every recipe CSV in a directory.
 * Results are cached by directory mtime so repeated calls are fast.
 * @param {string} recipesDir
 * @returns {Promise<{
 *   month: string,
 *   rows: Record<string, any>[],
 *   total: number,
 *   itemCount: number,
 *   byCategory: Record<string, number>,
 *   byStore: Record<string, number>,
 *   nonChfWarnings: string[]
 * }[]>}
 */
export async function loadAllMonths(recipesDir) {
  let dirStat;
  try {
    dirStat = await stat(recipesDir);
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(`Recipes directory not found: ${recipesDir}`);
    }
    throw err;
  }

  const cached = cache.get(recipesDir);
  if (cached && cached.mtimeMs === dirStat.mtimeMs) {
    console.log(`cache hit for ${recipesDir}`);
    return cached.data;
  }

  const entries = await readdir(recipesDir, { withFileTypes: true });
  const fileNames = entries
    .filter((entry) => entry.isFile() && RECIPE_FILE_RE.test(entry.name))
    .map((entry) => entry.name)
    .sort();

  const results = [];
  for (const fileName of fileNames) {
    const month = monthFromFilename(fileName);
    if (!month) continue;

    const text = await readFile(path.join(recipesDir, fileName), 'utf-8');
    const { rows } = parseRecipeCsv(text);

    const nonChfWarnings = [];
    const byCategory = {};
    const byStore = {};
    let total = 0;

    for (const row of rows) {
      const amount = chfAmount(row);
      total += amount;

      byCategory[row.Category] = (byCategory[row.Category] || 0) + amount;
      byStore[row.Store] = (byStore[row.Store] || 0) + amount;

      if (row.Currency && row.Currency !== 'CHF') {
        nonChfWarnings.push(`${row.Date} ${row.Store} — ${row.Currency}`);
      }
    }

    results.push({
      month,
      rows,
      total,
      itemCount: rows.length,
      byCategory,
      byStore,
      topStore: topEntry(byStore),
      topCategory: topEntry(byCategory),
      nonChfWarnings,
    });
  }

  results.sort(sortByMonth);

  cache.set(recipesDir, { mtimeMs: dirStat.mtimeMs, data: results });
  return results;
}
