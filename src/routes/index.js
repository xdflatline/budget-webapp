import { Router } from 'express';
import { listRecipeFiles } from '../lib/csv.js';

const router = Router();

router.get('/', async (_req, res) => {
  const recipesDir = process.env.RECIPES_DIR || '/home/master/finance/recipes';
  let files = [];
  try {
    files = await listRecipeFiles(recipesDir);
  } catch (err) {
    // If the directory is missing, render the page with an empty file list
    // and a warning the user can see.
    res.locals.recipeError = err.message;
  }

  return res.render('index', {
    title: 'budget-webapp',
    files,
    recipesDir,
  });
});

export default router;
