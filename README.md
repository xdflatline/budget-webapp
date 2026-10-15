# budget-webapp

Personal budgeting webapp — monthly spend, category breakdowns, and store trends from recipe CSVs.

## Stack

- Node.js 20+ (currently `v22.22.3`)
- Express 4
- Eta 3 template engine
- Chart.js 4 (local copy, loaded via importmap)
- csv-parse
- Plain ESM, no bundler

## Setup

```bash
cp .env.example .env
npm install
```

## Run

```bash
npm start        # production-ish run with plain node
npm run dev      # development with nodemon
```

The app listens on the port in `.env` (default `3000`).

## Environment variables

| Variable    | Default                       | Description                     |
|-------------|-------------------------------|---------------------------------|
| `RECIPES_DIR` | `/home/master/finance/recipes` | Directory with `recipes_YYYY-MM.csv` files |
| `PORT`        | `3000`                         | HTTP server port                |

## Data source

Recipe CSVs are expected to have this header:

```
Date,Store,Category,Item,Price,Currency,Rate,OriginalPrice
```

Files are matched by the pattern `recipes_YYYY-MM.csv`.

## Development

```bash
npm test         # run node:test unit tests
npm run lint     # run ESLint
```

## Health check

```bash
curl http://localhost:3000/healthz
# -> {"ok":true}
```
