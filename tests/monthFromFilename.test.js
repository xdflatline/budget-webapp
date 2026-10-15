import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { monthFromFilename } from '../src/lib/ingest.js';

describe('monthFromFilename', () => {
  it('extracts YYYY-MM from a valid recipe filename', () => {
    assert.equal(monthFromFilename('recipes_2026-07.csv'), '2026-07');
  });

  it('returns null for non-recipe filenames', () => {
    assert.equal(monthFromFilename('notarecipe.csv'), null);
  });

  it('returns null for filenames with bad month formats', () => {
    assert.equal(monthFromFilename('recipes_2026-7.csv'), null);
    assert.equal(monthFromFilename('recipes_2026-13.csv'), null);
    assert.equal(monthFromFilename('recipes_2026-07.txt'), null);
  });
});
