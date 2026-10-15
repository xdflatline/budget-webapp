import { Router } from 'express';
import { stringify } from 'csv-stringify/sync';
import { loadAllMonths } from '../lib/ingest.js';
import { formatChf } from '../lib/format.js';
import { buildChartData, safeJsonScript } from '../lib/chart-data.js';

const router = Router();

const MONTH_PARAM_RE = /^\d{4}-\d{2}$/;

function recipesDir() {
  return process.env.RECIPES_DIR || '/home/master/finance/recipes';
}

function chfAmount(row) {
  const price = Number(row.Price);
  if (Number.isNaN(price)) return 0;
  const rate = Number(row.Rate);
  return Number.isNaN(rate) || rate === 0 ? price : price * rate;
}

function monthName(monthKey) {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function sortByAmountDesc(a, b) {
  return b.subtotal - a.subtotal;
}

function buildMonthViewModel(monthData) {
  const { month, rows, total, byCategory, byStore } = monthData;

  const stores = Object.entries(byStore)
    .map(([name, subtotal]) => ({
      name,
      subtotal,
      items: rows
        .filter((row) => row.Store === name)
        .map((row) => ({ ...row, priceChf: chfAmount(row) }))
        .sort((a, b) => new Date(a.Date) - new Date(b.Date)),
    }))
    .sort(sortByAmountDesc);

  const categories = Object.entries(byCategory)
    .map(([name, subtotal]) => ({ name, subtotal }))
    .sort(sortByAmountDesc);

  const topCategoryEntry = categories[0];

  return {
    title: `${monthName(month)} spending`,
    month,
    monthName: monthName(month),
    total,
    itemCount: rows.length,
    storeCount: stores.length,
    topCategory: topCategoryEntry ? topCategoryEntry.name : null,
    stores,
    categories,
    formatChf,
  };
}

function isValidMonthParam(value) {
  if (!MONTH_PARAM_RE.test(value)) return false;
  const month = Number(value.slice(5, 7));
  return month >= 1 && month <= 12;
}

async function resolveMonthData(month) {
  if (!isValidMonthParam(month)) {
    return { error: { status: 400, message: 'Invalid month format. Expected YYYY-MM.' } };
  }

  let months;
  try {
    months = await loadAllMonths(recipesDir());
  } catch (err) {
    return { error: { status: 500, message: err.message } };
  }

  const monthData = months.find((m) => m.month === month);
  if (!monthData) {
    return { error: { status: 404, message: `No data for ${month}` } };
  }

  return { data: monthData };
}

router.get('/spending/:month.csv', async (req, res) => {
  const month = req.params.month.replace(/\.csv$/i, '');
  const result = await resolveMonthData(month);

  if (result.error) {
    return res.status(result.error.status).send(result.error.message);
  }

  const rows = result.data.rows.map((row) => ({
    Date: row.Date,
    Store: row.Store,
    Category: row.Category,
    Item: row.Item,
    Price: row.Price,
    Currency: row.Currency,
    Rate: row.Rate,
    OriginalPrice: row.OriginalPrice,
  }));

  const csv = stringify(rows, { header: true });

  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="spending-${month}.csv"`);
  return res.send(csv);
});

router.get('/spending/:month', async (req, res) => {
  const month = req.params.month.replace(/\.csv$/i, '');
  const result = await resolveMonthData(month);

  if (result.error) {
    return res.status(result.error.status).send(result.error.message);
  }

  return res.render('spending-month', buildMonthViewModel(result.data));
});

router.get('/spending', async (_req, res) => {
  const dir = recipesDir();
  let months = [];
  let error = null;
  try {
    months = await loadAllMonths(dir);
  } catch (err) {
    error = err.message;
  }

  const chartData = months.length > 0 ? buildChartData(months) : null;

  return res.render('spending', {
    title: 'Monthly spending',
    months,
    error,
    formatChf,
    chartData,
    safeJsonScript,
  });
});

router.get('/api/spending', async (_req, res) => {
  const dir = recipesDir();
  res.set('Cache-Control', 'no-store');
  try {
    const months = await loadAllMonths(dir);
    return res.json({ months });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
