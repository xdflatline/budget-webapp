/**
 * Build Chart.js-ready datasets from ingest output.
 *
 * @typedef {Object} MonthAggregate
 * @property {string} month
 * @property {number} total
 * @property {Record<string, number>} byCategory
 * @property {Record<string, number>} byStore
 *
 * @param {MonthAggregate[]} months
 * @returns {{
 *   monthlyTotals: { labels: string[], datasets: object[] },
 *   categoryStack: { labels: string[], datasets: object[] },
 *   topStores: { labels: string[], datasets: object[] }
 * }}
 */
export function buildChartData(months) {
  const labels = months.map((m) => m.month);

  const monthlyTotals = {
    labels,
    datasets: [
      {
        label: 'Total CHF',
        data: months.map((m) => roundCents(m.total)),
        backgroundColor: 'rgba(13, 110, 253, 0.7)',
      },
    ],
  };

  const allCategories = new Set();
  for (const month of months) {
    for (const category of Object.keys(month.byCategory)) {
      allCategories.add(category);
    }
  }

  const categoryPalette = [
    'rgba(13, 110, 253, 0.7)',
    'rgba(25, 135, 84, 0.7)',
    'rgba(255, 193, 7, 0.7)',
    'rgba(220, 53, 69, 0.7)',
    'rgba(111, 66, 193, 0.7)',
    'rgba(13, 202, 240, 0.7)',
    'rgba(253, 126, 20, 0.7)',
    'rgba(102, 16, 242, 0.7)',
  ];

  const categoryStack = {
    labels,
    datasets: [...allCategories].sort().map((category, index) => ({
      label: category,
      data: months.map((m) => roundCents(m.byCategory[category] || 0)),
      backgroundColor: categoryPalette[index % categoryPalette.length],
      stack: 'total',
    })),
  };

  const storeTotals = new Map();
  for (const month of months) {
    for (const [store, amount] of Object.entries(month.byStore)) {
      storeTotals.set(store, (storeTotals.get(store) || 0) + amount);
    }
  }

  const topStoresEntries = [...storeTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const storePalette = [
    'rgba(13, 110, 253, 0.7)',
    'rgba(25, 135, 84, 0.7)',
    'rgba(255, 193, 7, 0.7)',
    'rgba(220, 53, 69, 0.7)',
    'rgba(111, 66, 193, 0.7)',
    'rgba(13, 202, 240, 0.7)',
    'rgba(253, 126, 20, 0.7)',
    'rgba(102, 16, 242, 0.7)',
  ];

  const topStores = {
    labels: topStoresEntries.map(([store]) => store),
    datasets: [
      {
        data: topStoresEntries.map(([, amount]) => roundCents(amount)),
        backgroundColor: topStoresEntries.map(
          (_, index) => storePalette[index % storePalette.length],
        ),
      },
    ],
  };

  return { monthlyTotals, categoryStack, topStores };
}

function roundCents(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Serialize a value for safe embedding inside a `<script type="application/json">`
 * tag. Replaces the `</script>` terminator sequence so HTML parsers cannot close
 * the script block prematurely.
 *
 * @param {any} value
 * @returns {string}
 */
export function safeJsonScript(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
}
