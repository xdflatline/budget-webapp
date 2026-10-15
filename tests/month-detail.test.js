import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { parse } from 'csv-parse/sync';
import app from '../src/server.js';

describe('GET /spending/:month', () => {
  let server;
  let baseUrl;

  before(async () => {
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const address = server.address();
    baseUrl = `http://localhost:${address.port}`;
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  it('renders October 2026 with the expected store', async () => {
    const response = await fetch(`${baseUrl}/spending/2026-10`);
    const body = await response.text();
    assert.equal(response.status, 200);
    assert.match(body, /October 2026/);
    assert.match(body, /Migros NMM Neuwiesen/);
  });

  it('rejects invalid month format with 400', async () => {
    const response = await fetch(`${baseUrl}/spending/2026-13`);
    assert.equal(response.status, 400);
  });

  it('returns 404 for an unknown month', async () => {
    const response = await fetch(`${baseUrl}/spending/1999-01`);
    assert.equal(response.status, 404);
  });
});

describe('GET /spending/:month.csv', () => {
  let server;
  let baseUrl;

  before(async () => {
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const address = server.address();
    baseUrl = `http://localhost:${address.port}`;
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  it('returns a CSV attachment with at least 8 rows', async () => {
    const response = await fetch(`${baseUrl}/spending/2026-10.csv`);
    const body = await response.text();
    assert.equal(response.status, 200);
    assert.ok(response.headers.get('content-type').startsWith('text/csv'));

    const records = parse(body, { columns: true, skip_empty_lines: true });
    assert.ok(records.length >= 8, `expected at least 8 rows, got ${records.length}`);
    assert.ok(records.some((row) => row.Store === 'Migros NMM Neuwiesen'));
  });
});
