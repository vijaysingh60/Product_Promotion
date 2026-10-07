// Loads the retail dataset from CSV. SERVER ONLY (uses fs) — client components get data via props.
//
// To use a different dataset, drop CSVs with the same columns into dmart_synthetic_dataset/
// (or point DATA_DIR at another folder), retrain with `npm run ml:train`, and restart.

import fs from "node:fs";
import path from "node:path";
import type { ComboFeatures, Customer, Inventory, Product, PromotionTarget } from "../types";

// The folder is chosen at runtime, so the bundler is told not to trace it (turbopackIgnore).
const DATA_DIR = process.env.DATA_DIR ?? path.join(/*turbopackIgnore: true*/ process.cwd(), "dmart_synthetic_dataset");

/** Minimal CSV reader — the dataset has no quoted fields. */
function readCsv(file: string): Record<string, string>[] {
  const [header, ...lines] = fs.readFileSync(/*turbopackIgnore: true*/ path.join(DATA_DIR, file), "utf8").trim().split(/\r?\n/);
  const columns = header.split(",");
  return lines.map((line) => {
    const cells = line.split(",");
    return Object.fromEntries(columns.map((c, i) => [c, cells[i]]));
  });
}
const unique = (values: string[]) => [...new Set(values)];

export const comboKey = (t: PromotionTarget) => `${t.productId}|${t.segment}|${t.location}`;

// ---------------------------------------------------------------- products
export const products: Product[] = readCsv("products.csv").map((r) => ({
  id: r.product_id,
  name: r.product_name,
  category: r.category,
  price: Number(r.price),
  cost: Number(r.cost),
  margin: Number(r.margin_pct),
}));

// ------------------------------------------- product × segment × location
export const combos: ComboFeatures[] = readCsv("promotion_model_data.csv").map((r) => ({
  productId: r.product_id,
  segment: r.customer_segment,
  location: r.location,
  affinity: Number(r.customer_affinity),
  regionalDemand: Number(r.regional_demand_score),
  historyUpliftPct: Number(r.historical_promotion_uplift_pct),
  historyCount: Number(r.historical_promotion_count),
  baselineDemand: Number(r.dummy_predicted_demand),
}));

export const SEGMENTS = unique(combos.map((c) => c.segment));
export const LOCATIONS = unique(combos.map((c) => c.location));
export const CATEGORIES = unique(products.map((p) => p.category)).sort();

// --------------------------------------------------------------- inventory
const demandByProductLocation = new Map<string, number>();
for (const c of combos) {
  const key = `${c.productId}|${c.location}`;
  demandByProductLocation.set(key, (demandByProductLocation.get(key) ?? 0) + c.baselineDemand);
}

export const inventory: Inventory[] = readCsv("inventory.csv").map((r) => ({
  productId: r.product_id,
  location: r.location,
  stock: Number(r.current_stock),
  reorderLevel: Number(r.reorder_level),
  leadTimeDays: Number(r.lead_time_days),
  predictedDemand: demandByProductLocation.get(`${r.product_id}|${r.location}`) ?? 0,
}));

// --------------------------------------------------------------- customers
export const customers: Customer[] = readCsv("customers.csv").map((r) => ({
  id: r.customer_id,
  age: Number(r.age),
  gender: r.gender,
  segment: r.segment,
  location: r.location,
  purchaseFrequency: Number(r.purchase_frequency_monthly),
  avgMonthlySpend: Number(r.avg_monthly_spend),
  preferredCategory: r.preferred_category,
}));

// ----------------------------------------------------------------- lookups
const productById = new Map(products.map((p) => [p.id, p]));
const inventoryByKey = new Map(inventory.map((i) => [`${i.productId}|${i.location}`, i]));
const comboByKey = new Map(combos.map((c) => [comboKey(c), c]));

export const getProduct = (id: string) => productById.get(id);
export const getInventory = (productId: string, location: string) => inventoryByKey.get(`${productId}|${location}`);
export const getCombo = (t: PromotionTarget) => comboByKey.get(comboKey(t));
