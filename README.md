# Promotion & Inventory Alignment Planner

Decision-support dashboard: which product to promote, to which customer segment, at what discount,
given demand, inventory and profit.

Data is the synthetic D-Mart-like dataset in `dmart_synthetic_dataset/` (simulated, not real D-Mart data).

## Run it (two terminals, everything local)

```bash
# one-time setup
npm install
pip3 install -r ml/requirements.txt     # global install, no virtualenv
brew install libomp                     # macOS only: OpenMP runtime that XGBoost needs

# terminal 1 — the model
npm run ml:train      # trains and writes ml/artifacts/ (already done once; rerun when data changes)
npm run ml:serve      # http://127.0.0.1:8000   (API docs at /docs)

# terminal 2 — the app
npm run dev           # http://localhost:3000
```

If the model service is not running the app still works: it falls back to a mock uplift formula and
shows an amber "ML service offline" badge instead of the green model badge.

## How it fits together

```
dmart_synthetic_dataset/*.csv ──┬─► ml/train.py ─► ml/artifacts/uplift_model.json
                                │                        │
                                │                  ml/server.py  (FastAPI, port 8000)
                                │                        ▲
                                └─► lib/dataset.ts       │ HTTP
                                         │               │
                                 lib/recommendationEngine.ts ◄─ lib/mlClient.ts
                                         │
                                  pages + /api/simulate
```

| Part | What it does |
|---|---|
| **ML model** (`ml/`) | Predicts **sales uplift %** for a product × segment × location × discount. XGBoost, 100 trees, depth 2. |
| **Dataset** (`lib/dataset.ts`) | Baseline demand, customer affinity, regional demand, stock, reorder level — read straight from the CSVs. |
| **Rules** (`lib/recommendationEngine.ts`) | Demand = baseline × (1 + uplift). Then the 0–100 score, risk level, and choice of discount. |

Pages: `/dashboard`, `/recommendations` (+ `/recommendations/[id]`), `/inventory`, `/customers`, `/simulator`.

## Model facts (from `npm run ml:train`)

Trained on the 1,200 past promotions in `promotions.csv`, scored with 5-fold cross-validation:

| Model | R² | MAE (uplift points) |
|---|---|---|
| Predict the mean | 0.00 | 19.6 |
| Straight line on discount only | 0.826 | 7.70 |
| **XGBoost, all 8 features (shipped)** | **0.823** | **7.77** |

In this synthetic dataset uplift depends almost entirely on the discount (98% of the model's gain).
Category, segment, location, price and affinity add no measurable signal, so XGBoost only matches a
straight line. The pipeline is the point: with real data the same features can carry real signal.

## Known limitations

- **Baseline demand is not modelled.** It comes from the dataset's `dummy_predicted_demand` column.
- **Score weights and thresholds are hand-set business rules**, not learned (`MAX_POINTS`, `RECOMMEND_SCORE`,
  `REVIEW_SCORE`, `campaignRisk`).
- **Inventory status uses the reorder level**, not "demand > stock": summed over the four segments,
  predicted demand exceeds stock for every product and location in this dataset.

## Swapping the dataset

Put CSVs with the same columns in `dmart_synthetic_dataset/` (or set `DATA_DIR` for both the app and the
ML scripts), run `npm run ml:train`, restart `npm run ml:serve` and the app.
