import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loadAllMonths } from '../src/lib/ingest.js';

const RECIPES_DIR = '/home/master/finance/recipes';

describe('loadAllMonths', () => {
  it('returns months sorted ascending', async () => {
    const months = await loadAllMonths(RECIPES_DIR);
    assert.ok(months.length >= 7);
    const sorted = months.map((m) => m.month).slice().sort();
    assert.deepEqual(months.map((m) => m.month), sorted);
  });

  it('parses the 2026-10 file with 25 data rows', async () => {
    const months = await loadAllMonths(RECIPES_DIR);
    const october = months.find((m) => m.month === '2026-10');
    assert.ok(october);
    assert.equal(october.rows.length, 25);
    assert.ok(october.total > 0);
    assert.ok(october.byCategory.grocery);
  });

  it('includes expected store and category buckets for 2026-10', async () => {
    const months = await loadAllMonths(RECIPES_DIR);
    const october = months.find((m) => m.month === '2026-10');
    assert.ok(october);
    assert.ok(october.byStore['Migros NMM Neuwiesen'] > 0);
    assert.ok(october.byCategory.grocery > 0);
  });
});

describe('monthFromFilename via loadAllMonths', () => {
  it('uses month keys derived from filenames', async () => {
    const months = await loadAllMonths(RECIPES_DIR);
    for (const { month } of months) {
      assert.match(month, /^\d{4}-\d{2}$/);
    }
  });
});
