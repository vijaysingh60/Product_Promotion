// Dashboard maths: filters, headline numbers, KPIs and chart series. Pure functions over plan rows,
// so every number on the dashboard can be reproduced from a script.

import { formatINRCompact } from "./format";
import type { InventoryRow, PlanRow, RiskLevel } from "../types";

export interface Filters {
  city: string;
  segment: string;
  category: string;
  risk: string;
}
export const NO_FILTERS: Filters = { city: "", segment: "", category: "", risk: "" };

export const filterRows = (rows: PlanRow[], f: Filters) =>
  rows.filter((r) => (!f.city || r.city === f.city) && (!f.segment || r.segment === f.segment) && (!f.category || r.category === f.category) && (!f.risk || r.risk === f.risk));

/** Inventory has no segment; its risk is the position's own (stockout / overstock). */
export const filterInventory = (rows: InventoryRow[], f: Filters) =>
  rows.filter((r) => (!f.city || r.city === f.city) && (!f.category || r.category === f.category) && (!f.risk || r.risk === f.risk));

const sum = <T,>(items: T[], f: (x: T) => number) => items.reduce((s, x) => s + f(x), 0);
const funded = (rows: PlanRow[]) => rows.filter((r) => r.status === "funded");

// -------------------------------------------------------------- headline
export interface Headline {
  /** Profit over the planning window if no promotion runs */
  baselineProfit: number;
  /** Baseline plus the incremental profit of the funded plan, after promo cost */
  projectedProfit: number;
  incrementalProfit: number;
  incrementalPct: number;
  budgetUsed: number;
  budgetTotal: number;
}

export function headline(rows: PlanRow[], budgetTotal: number): Headline {
  const baselineProfit = sum(rows, (r) => r.baselineProfit);
  const plan = funded(rows);
  const incrementalProfit = sum(plan, (r) => r.incrementalProfit);
  return {
    baselineProfit,
    projectedProfit: baselineProfit + incrementalProfit,
    incrementalProfit,
    incrementalPct: baselineProfit > 0 ? (incrementalProfit / baselineProfit) * 100 : 0,
    budgetUsed: sum(plan, (r) => r.promoCost),
    budgetTotal,
  };
}

// ------------------------------------------------------------------ KPIs
export interface Kpis {
  recommended: number;
  notFunded: number;
  rejected: number;
  topRejection: { reason: string; count: number } | null;
  stockoutRiskProducts: number;
  overstockedProducts: number;
  inventoryValue: number;
  avgDiscount: number;
}

export function kpis(rows: PlanRow[], inventory: InventoryRow[]): Kpis {
  const plan = funded(rows);
  const rejected = rows.filter((r) => r.status === "rejected");
  const reasons = new Map<string, number>();
  rejected.forEach((r) => r.reason && reasons.set(r.reason, (reasons.get(r.reason) ?? 0) + 1));
  const top = [...reasons.entries()].sort((a, b) => b[1] - a[1])[0];
  const uniqueProducts = (status: InventoryRow["status"]) => new Set(inventory.filter((i) => i.status === status).map((i) => i.productId)).size;
  return {
    recommended: plan.length,
    notFunded: rows.filter((r) => r.status === "unfunded").length,
    rejected: rejected.length,
    topRejection: top ? { reason: top[0], count: top[1] } : null,
    stockoutRiskProducts: uniqueProducts("Stockout risk"),
    overstockedProducts: uniqueProducts("Overstock"),
    inventoryValue: sum(inventory, (i) => i.inventoryValue),
    avgDiscount: plan.length ? sum(plan, (r) => r.discountPct ?? 0) / plan.length : 0,
  };
}

// ---------------------------------------------------------------- charts
export interface WaterfallStep {
  name: string;
  /** Invisible spacer under the visible bar */
  base: number;
  value: number;
  /** Signed change (for tooltips) */
  delta: number;
  /** Text shown above the bar: "₹1.81Cr" for totals, "+₹12.4L" / "-₹5.2L" for steps */
  label: string;
  kind: "total" | "up" | "down";
}

/** Baseline → extra-unit profit → discount given away → stockout loss → promo cost → clearance → projected. */
export function waterfall(rows: PlanRow[]): { steps: WaterfallStep[]; axisMin: number; axisMax: number; ticks: number[] } {
  const plan = funded(rows);
  const baseline = sum(rows, (r) => r.baselineProfit);
  const deltas: [string, number][] = [
    ["Extra units", sum(plan, (r) => r.bridge.volume)],
    ["Discount given away", sum(plan, (r) => r.bridge.giveaway)],
    ["Stockout loss", sum(plan, (r) => r.bridge.stockLoss)],
    ["Promo cost", sum(plan, (r) => r.bridge.promoCost)],
    ["Clearance value", sum(plan, (r) => r.bridge.clearance)],
  ];
  const stepText = (d: number) => `${d >= 0 ? "+" : ""}${formatINRCompact(d)}`;
  const steps: WaterfallStep[] = [{ name: "Baseline", base: 0, value: baseline, delta: baseline, label: formatINRCompact(baseline), kind: "total" }];
  let running = baseline;
  let lo = baseline;
  let hi = baseline;
  for (const [name, delta] of deltas) {
    if (Math.abs(delta) < 1) continue;
    const next = running + delta;
    steps.push({ name, base: Math.min(running, next), value: Math.abs(delta), delta, label: stepText(delta), kind: delta >= 0 ? "up" : "down" });
    running = next;
    lo = Math.min(lo, running);
    hi = Math.max(hi, running);
  }
  steps.push({ name: "Projected", base: 0, value: running, delta: running, label: formatINRCompact(running), kind: "total" });

  // The incremental steps are tiny next to the baseline, so the axis starts just below them.
  // Min, max and ticks are computed here (not left to the chart) so the axis matches the caption exactly.
  const spread = Math.max(...steps.slice(1, -1).map((s) => s.value), 1) * 3;
  const axisMin = Math.max(0, Math.floor((lo - spread) / 1e5) * 1e5);
  const axisMax = Math.max(axisMin + 1e5, Math.ceil((hi + spread * 0.15) / 1e5) * 1e5);
  const ticks = Array.from({ length: 5 }, (_, i) => axisMin + ((axisMax - axisMin) * i) / 4);
  return { steps, axisMin, axisMax, ticks };
}

export interface GroupPoint {
  name: string;
  incrementalProfit: number;
  promotions: number;
}
export function groupIncremental(rows: PlanRow[], key: "city" | "segment", order: readonly string[]): GroupPoint[] {
  const plan = funded(rows);
  return order.map((name) => {
    const g = plan.filter((r) => r[key] === name);
    return { name, incrementalProfit: Math.round(sum(g, (r) => r.incrementalProfit)), promotions: g.length };
  });
}

export function topProducts(rows: PlanRow[], n = 5): GroupPoint[] {
  const byProduct = new Map<string, GroupPoint>();
  for (const r of funded(rows)) {
    const g = byProduct.get(r.productName) ?? { name: r.productName, incrementalProfit: 0, promotions: 0 };
    g.incrementalProfit += r.incrementalProfit;
    g.promotions += 1;
    byProduct.set(r.productName, g);
  }
  return [...byProduct.values()].sort((a, b) => b.incrementalProfit - a.incrementalProfit).slice(0, n).map((g) => ({ ...g, incrementalProfit: Math.round(g.incrementalProfit) }));
}

export interface ScatterPoint {
  id: string;
  label: string;
  discount: number;
  incrementalProfit: number;
  units: number;
  risk: RiskLevel;
}
export const scatterPoints = (rows: PlanRow[]): ScatterPoint[] =>
  funded(rows).map((r) => ({
    id: r.id,
    label: `${r.productName} · ${r.segment} · ${r.city}`,
    discount: r.discountPct ?? 0,
    incrementalProfit: Math.round(r.incrementalProfit),
    units: Math.max(1, Math.round(r.predictedDemand)),
    risk: r.risk,
  }));

export interface StockDemandPoint {
  name: string;
  stock: number;
  demand: number;
  /** Cities where predicted demand is higher than the stock there (stock is never shared between cities) */
  shortCities: string[];
}
/** Stock against predicted demand per product, summed over the cities in view. */
export function stockVsDemand(inventory: InventoryRow[]): StockDemandPoint[] {
  const by = new Map<string, StockDemandPoint>();
  for (const i of inventory) {
    const p = by.get(i.productName) ?? { name: i.productName, stock: 0, demand: 0, shortCities: [] };
    p.stock += i.stock;
    p.demand += i.predictedDemand;
    if (i.predictedDemand > i.stock) p.shortCities.push(i.city);
    by.set(i.productName, p);
  }
  return [...by.values()].map((p) => ({ ...p, stock: Math.round(p.stock), demand: Math.round(p.demand) }));
}

export function riskDistribution(rows: PlanRow[]): { name: RiskLevel; value: number }[] {
  const plan = funded(rows);
  return (["Low", "Medium", "High"] as RiskLevel[]).map((name) => ({ name, value: plan.filter((r) => r.risk === name).length }));
}
