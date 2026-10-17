import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { listRecipeFiles, parseRecipeCsv } from '../src/lib/csv.js';

const RECIPES_DIR = process.env.RECIPES_DIR || '/home/master/finance/recipes';

const SAMPLE_CSV = `Date,Store,Category,Item,Price,Currency,Rate,OriginalPrice
2026-10-13,Store A,grocery,Item A,5.80,CHF,1.0000,
2026-10-13,Store B,health,Item B,19.60,CHF,1.0000,
`;

const HEADERS = ['Date', 'Store', 'Category', 'Item', 'Price', 'Currency', 'Rate', 'OriginalPrice'];

describe('listRecipeFiles', () => {
  let tempDir;

  it('lists recipe CSV files sorted by filename', async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'budget-recipes-'));
    await writeFile(path.join(tempDir, 'recipes_2026-09.csv'), 'header\n');
    await writeFile(path.join(tempDir, 'recipes_2026-10.csv'), 'header\n');
    await writeFile(path.join(tempDir, 'not-a-recipe.txt'), 'ignored\n');

    const files = await listRecipeFiles(tempDir);
    assert.deepEqual(files, ['recipes_2026-09.csv', 'recipes_2026-10.csv']);
    for (const file of files) {
      assert.match(file, /^recipes_\d{4}-\d{2}\.csv$/);
    }
  });

  it('throws when the directory does not exist', async () => {
    await assert.rejects(listRecipeFiles('/does/not/exist'));
  });

  it('lists real recipe files when RECIPES_DIR points to them', async () => {
    const files = await listRecipeFiles(RECIPES_DIR);
    assert.ok(files.includes('recipes_2026-10.csv'));
    assert.deepEqual(files, files.slice().sort());
  });
});

describe('parseRecipeCsv', () => {
  it('returns headers and rows', () => {
    const result = parseRecipeCsv(SAMPLE_CSV);
    assert.deepEqual(result.headers, HEADERS);
    assert.equal(result.rows.length, 2);
  });

  it('parses Price as a number', () => {
    const result = parseRecipeCsv(SAMPLE_CSV);
    assert.equal(typeof result.rows[0].Price, 'number');
    assert.equal(result.rows[0].Price, 5.8);
  });

  it('keeps empty OriginalPrice empty', () => {
    const result = parseRecipeCsv(SAMPLE_CSV);
    assert.equal(result.rows[0].OriginalPrice, '');
  });

  it('parses the 2026-10 file with all data rows', async () => {
    const csvPath = process.env.RECIPES_DIR
      ? path.join(RECIPES_DIR, 'recipes_2026-10.csv')
      : path.join('/home/master/finance/recipes', 'recipes_2026-10.csv');
    const text = await readFile(csvPath, 'utf-8');
    const result = parseRecipeCsv(text);
    assert.deepEqual(result.headers, HEADERS);
    // The actual 2026-10 file contains 25 data rows (26 lines including header).
    assert.equal(result.rows.length, 25);

    const priceTypes = new Set(result.rows.map((row) => typeof row.Price));
    assert.deepEqual(priceTypes, new Set(['number']), 'all Price values should be numbers');
  });
});
