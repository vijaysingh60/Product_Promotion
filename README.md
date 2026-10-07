# PromoPilot — Promotion & Inventory Planner

Decides **what to promote, to which customer segment, in which city, at what discount** — judged on
**incremental profit** (profit with the promotion minus profit without it), inside hard price and stock rules.

```bash
npm install
npm run dev        # http://localhost:3000
npm run verify     # checks the engine from the console, no UI
```

Everything runs in TypeScript. No database, no auth, no external calls.

## The rules the engine never breaks

| Rule | Where |
|---|---|
| Offer price ≥ **CP × 1.05** and ≤ **MRP**. Empty band → rejected: *"No profitable discount available"* | `lib/pricing.ts` |
| Expected buyers ≤ **80% of safe units**; safe units = stock − **15%** safety stock. No headroom → *"Protect stock"* | `lib/decisionEngine.ts` |
| Stock is **per city**; a city is never promoted using another city's stock | `lib/mockData.ts`, engine |
| Decide on **incremental profit**. Negative → *"Customers would have bought anyway"* | engine |
| Funded promotions never exceed the **marketing budget**, and never double-claim stock | budget allocator |

Margin floor, safety-stock %, cost per contact (₹3) and the budget live in **one object**, `lib/config.ts`.
The four are also editable on the dashboard (**Assumptions** panel); the values are kept in a cookie so every page agrees.

## How a decision is made

For each product × segment × city: legal discount band → grid-search in 2.5-point steps → for each discount call the
response, demand and inventory models → baseline vs promoted → incremental profit (returns netted out, units capped by
safe stock, stockout probability priced in) → best risk-adjusted option → verdict. Then the allocator ranks the
`PROMOTE` candidates by incremental profit per ₹ of promo cost and fills the budget, deducting stock as it goes
(*"audience reduced: 180 units already committed in Hyderabad"*).

Extras: **clearance** promotions for overstocked slow movers (value of freeing stock counted separately),
**alternatives** only for rejected candidates (best same-category product that passes), **fatigue** that grows with each
campaign planned for the same segment.

## Files

```
lib/config.ts            tunable business rules
lib/mockData.ts          products, per-city stock, segments, past promotions, seasonality (seeded, no customers)
lib/pricing.ts           CP/MRP legal band
lib/models/              responseModel · demandModel · inventoryModel   ← deterministic stubs, swap targets
lib/decisionEngine.ts    grid search, verdicts, budget allocator, discount curve
lib/analytics.ts         dashboard numbers and chart series
scripts/verify.mts       console check of constraints + the three demo cases
```

Each model file starts with *"Deterministic stub — replace with trained model via API later."* and takes/returns plain
typed numbers. The engine and UI do not care what is behind them.

## Demo cases (checked by `npm run verify`)

| | Case | Where to look |
|---|---|---|
| a | High demand + low stock → small audience, small discount, warning | Wireless Headphones · Students · Hyderabad |
| b | Thin margin (4%) → **rejected**, no profitable discount | Television · any segment · any city |
| c | Overstocked slow mover → **clearance** promotion | Coffee Maker · Families · Chennai |

## Not built, on purpose

No per-customer targeting, no training in this layer, no competitor pricing, no multi-warehouse allocation,
no LLM calls (explanations are templates), no auth, no database.

## About `ml/` and `dmart_synthetic_dataset/`

The earlier XGBoost uplift service (`ml/`, `npm run ml:serve`) and its dataset are still on disk but **the app no longer
calls them**. They were trained on a different schema (no MRP, seasonality, daily sales rate…). The intended seam for a
trained model is `lib/models/demandModel.ts`; see the notes in the project hand-off for what it takes.
