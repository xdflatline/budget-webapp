import { describe, it, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { ingestCache } from '../src/lib/cache.js';

// Import the app after setting NODE_ENV so it does not call app.listen().
process.env.NODE_ENV = 'test';
const { default: app } = await import('../src/server.js');

const VALID_HEADERS = 'Date,Store,Category,Item,Price,Currency,Rate,OriginalPrice\n';

function buildCsv(rows) {
  return VALID_HEADERS + rows.map((r) => r.join(',')).join('\n') + '\n';
}

describe('POST /upload', () => {
  let tmpDir;
  let originalRecipesDir;

  before(async () => {
    originalRecipesDir = process.env.RECIPES_DIR;
    tmpDir = await mkdtemp(path.join(tmpdir(), 'budget-upload-'));
    process.env.RECIPES_DIR = tmpDir;
  });

  after(async () => {
    process.env.RECIPES_DIR = originalRecipesDir;
    await rm(tmpDir, { recursive: true, force: true });
  });

  afterEach(async () => {
    ingestCache.clear();
    for (const entry of await readdir(tmpDir).catch(() => [])) {
      await rm(path.join(tmpDir, entry), { recursive: true, force: true });
    }
  });

  it('accepts a valid CSV, writes it, and redirects to /spending', async () => {
    const csv = buildCsv([
      ['2026-10-13', 'Store A', 'grocery', 'Item A', '5.80', 'CHF', '1.0000', ''],
      ['2026-10-14', 'Store B', 'health', 'Item B', '19.60', 'CHF', '1.0000', ''],
    ]);

    ingestCache.set('all-months', { placeholder: true });

    await request(app)
      .post('/upload')
      .attach('recipe', Buffer.from(csv), 'recipes_2026-10.csv')
      .expect('Content-Type', /plain/)
      .expect(302)
      .expect('Location', '/spending');

    const written = await readFile(path.join(tmpDir, 'recipes_2026-10.csv'), 'utf-8');
    assert.equal(written, csv);
    assert.equal(ingestCache.get('all-months'), undefined, 'cache should be cleared');
  });

  it('rejects a filename that does not match recipes_YYYY-MM.csv', async () => {
    const csv = buildCsv([['2026-10-13', 'Store A', 'grocery', 'Item A', '5.80', 'CHF', '1.0000', '']]);

    const res = await request(app)
      .post('/upload')
      .attach('recipe', Buffer.from(csv), 'bad-name.csv')
      .expect(400);

    assert.match(res.text, /filename must match/);
  });

  it('rejects a CSV with missing required columns', async () => {
    const badCsv = 'Date,Store,Category,Item,Price\n2026-10-13,Store A,grocery,Item A,5.80\n';

    const res = await request(app)
      .post('/upload')
      .attach('recipe', Buffer.from(badCsv), 'recipes_2026-10.csv')
      .expect(400);

    assert.match(res.text, /missing required column/);
  });

  it('rejects a non-CSV Content-Type', async () => {
    const csv = buildCsv([['2026-10-13', 'Store A', 'grocery', 'Item A', '5.80', 'CHF', '1.0000', '']]);

    const res = await request(app)
      .post('/upload')
      .attach('recipe', Buffer.from(csv), { filename: 'recipes_2026-10.csv', contentType: 'application/octet-stream' })
      .expect(400);

    assert.match(res.text, /Content-Type must be text\/csv/);
  });
});
