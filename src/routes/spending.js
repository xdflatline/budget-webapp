import { Router } from 'express';
import { loadAllMonths } from '../lib/ingest.js';
import { formatChf } from '../lib/format.js';

const router = Router();

function recipesDir() {
  return process.env.RECIPES_DIR || '/home/master/finance/recipes';
}

router.get('/spending', async (_req, res) => {
  const dir = recipesDir();
  let months = [];
  let error = null;
  try {
    months = await loadAllMonths(dir);
  } catch (err) {
    error = err.message;
  }

  return res.render('spending', {
    title: 'Monthly spending',
    months,
    error,
    formatChf,
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
