import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { listRecipeFiles, parseRecipeCsv } from '../src/lib/csv.js';

const RECIPES_DIR = '/home/master/finance/recipes';

const SAMPLE_CSV = `Date,Store,Category,Item,Price,Currency,Rate,OriginalPrice
2026-10-13,Store A,grocery,Item A,5.80,CHF,1.0000,
2026-10-13,Store B,health,Item B,19.60,CHF,1.0000,
`;

const HEADERS = ['Date', 'Store', 'Category', 'Item', 'Price', 'Currency', 'Rate', 'OriginalPrice'];

describe('listRecipeFiles', () => {
  it('lists recipe CSV files sorted by filename', async () => {
    const files = await listRecipeFiles(RECIPES_DIR);
    assert.ok(files.includes('recipes_2026-10.csv'));
    assert.deepEqual(files, files.slice().sort());
    for (const file of files) {
      assert.match(file, /^recipes_\d{4}-\d{2}\.csv$/);
    }
  });

  it('throws when the directory does not exist', async () => {
    await assert.rejects(listRecipeFiles('/does/not/exist'));
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
    const text = await readFile(path.join(RECIPES_DIR, 'recipes_2026-10.csv'), 'utf-8');
    const result = parseRecipeCsv(text);
    assert.deepEqual(result.headers, HEADERS);
    // The actual 2026-10 file contains 25 data rows (26 lines including header).
    assert.equal(result.rows.length, 25);

    const priceTypes = new Set(result.rows.map((row) => typeof row.Price));
    assert.deepEqual(priceTypes, new Set(['number']), 'all Price values should be numbers');
  });
});
