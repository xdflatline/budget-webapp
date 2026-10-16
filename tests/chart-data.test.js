import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildChartData, safeJsonScript } from '../src/lib/chart-data.js';
import { loadAllMonths } from '../src/lib/ingest.js';

const RECIPES_DIR = '/home/master/finance/recipes';

describe('buildChartData', () => {
  it('matches ingest totals for monthly spend (approximate)', async () => {
    const months = await loadAllMonths(RECIPES_DIR);
    const { monthlyTotals } = buildChartData(months);

    assert.deepEqual(monthlyTotals.labels, months.map((m) => m.month));
    assert.equal(monthlyTotals.datasets.length, 1);
    assert.equal(monthlyTotals.datasets[0].data.length, months.length);

    for (let i = 0; i < months.length; i += 1) {
      const expected = months[i].total;
      const actual = monthlyTotals.datasets[0].data[i];
      assert.ok(
        Math.abs(expected - actual) < 0.01,
        `month ${months[i].month}: expected ${expected}, got ${actual}`,
      );
    }
  });

  it('builds a stacked category dataset for every category present', async () => {
    const months = await loadAllMonths(RECIPES_DIR);
    const { categoryStack } = buildChartData(months);

    assert.deepEqual(categoryStack.labels, months.map((m) => m.month));

    const expectedCategories = new Set();
    for (const month of months) {
      for (const category of Object.keys(month.byCategory)) {
        expectedCategories.add(category);
      }
    }

    assert.equal(categoryStack.datasets.length, expectedCategories.size);

    for (const dataset of categoryStack.datasets) {
      assert.ok(expectedCategories.has(dataset.label));
      assert.equal(dataset.data.length, months.length);
      assert.equal(dataset.stack, 'total');
    }
  });

  it('rounds category values to cents', async () => {
    const months = await loadAllMonths(RECIPES_DIR);
    const { categoryStack } = buildChartData(months);

    for (const dataset of categoryStack.datasets) {
      for (let i = 0; i < months.length; i += 1) {
        const value = dataset.data[i];
        assert.ok(
          Number.isFinite(value),
          `${dataset.label} at ${months[i].month} is finite`,
        );
        const decimals = value.toString().split('.')[1];
        assert.ok(
          !decimals || decimals.length <= 2,
          `${dataset.label} at ${months[i].month} has at most two decimals`,
        );
      }
    }
  });

  it('returns at most 8 top stores sorted descending', async () => {
    const months = await loadAllMonths(RECIPES_DIR);
    const { topStores } = buildChartData(months);

    assert.ok(topStores.labels.length <= 8);
    assert.equal(topStores.datasets.length, 1);
    assert.equal(topStores.datasets[0].data.length, topStores.labels.length);

    for (let i = 1; i < topStores.datasets[0].data.length; i += 1) {
      assert.ok(
        topStores.datasets[0].data[i - 1] >= topStores.datasets[0].data[i],
        'top stores are sorted descending',
      );
    }
  });

  it('top store totals match ingest aggregation (approximate)', async () => {
    const months = await loadAllMonths(RECIPES_DIR);
    const { topStores } = buildChartData(months);

    const storeTotals = new Map();
    for (const month of months) {
      for (const [store, amount] of Object.entries(month.byStore)) {
        storeTotals.set(store, (storeTotals.get(store) || 0) + amount);
      }
    }

    for (let i = 0; i < topStores.labels.length; i += 1) {
      const store = topStores.labels[i];
      const expected = storeTotals.get(store);
      const actual = topStores.datasets[0].data[i];
      assert.ok(
        Math.abs(expected - actual) < 0.01,
        `${store}: expected ${expected}, got ${actual}`,
      );
    }
  });
});

describe('safeJsonScript', () => {
  it('round-trips JSON and escapes script terminators', () => {
    const value = {
      labels: ['2026-03', '2026-04'],
      datasets: [{ data: [12.34, 56.78] }],
      trick: '</script><script>alert(1)</script>',
    };
    const serialized = safeJsonScript(value);
    assert.ok(!serialized.includes('</script>'));
    assert.deepEqual(JSON.parse(serialized), value);
  });
});
