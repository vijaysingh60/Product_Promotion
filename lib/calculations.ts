// Pure helpers: formatting and business maths. No data access here (safe to import from client components).

import type { Customer, RiskLevel, Segment, StockStatus } from "../types";

export const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));

const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
/** 148500 → "₹1,48,500", -4800 → "-₹4,800" */
export const formatINR = (n: number) => `${n < 0 ? "-" : ""}₹${inr.format(Math.abs(Math.round(n)))}`;
export const formatNumber = (n: number) => inr.format(Math.round(n));

/** Score cut-offs: at or above RECOMMEND_SCORE → Recommended (unless High risk); below REVIEW_SCORE → Not Recommended. */
export const RECOMMEND_SCORE = 60;
export const REVIEW_SCORE = 45;

/** Discounts the planner considers (percent). The uplift model was trained on exactly these. */
export const DISCOUNT_OPTIONS = [5, 10, 15, 20, 25, 30];

/**
 * MOCK sales uplift (%) for a discount, with diminishing returns.
 * Only used when the ML service (ml/server.py) is not reachable.
 */
export function fallbackUpliftPct(discountPct: number) {
  const d = discountPct / 100;
  return ((4 * d) / (1 + 3 * d)) * 100;
}

export const discountedPrice = (price: number, discountPct: number) => price * (1 - discountPct / 100);

/** Gross margin (%) left after the discount is applied. Cost stays fixed. */
export function marginAfterDiscount(marginPct: number, discountPct: number) {
  const cost = 1 - marginPct / 100;
  const net = 1 - discountPct / 100;
  return ((net - cost) / net) * 100;
}

export function expectedRevenue(price: number, discountPct: number, units: number) {
  return discountedPrice(price, discountPct) * units;
}

export function expectedProfit(price: number, cost: number, discountPct: number, units: number) {
  return (discountedPrice(price, discountPct) - cost) * units;
}

/** Inventory status: current stock compared with the reorder level. */
export function stockStatus(stock: number, reorderLevel: number): StockStatus {
  const ratio = stock / reorderLevel;
  if (ratio >= 1) return "Healthy";
  if (ratio >= 0.75) return "Low Stock";
  return "Critical";
}

export const stockStatusToRisk = (s: StockStatus): RiskLevel =>
  s === "Healthy" ? "Low" : s === "Low Stock" ? "Medium" : "High";

/** Combine campaign signals into a single risk level. */
export function campaignRisk(opts: {
  /** Stock left after the campaign ÷ reorder level */
  stockAfterRatio: number;
  marginAfterPct: number;
  discount: number;
}): RiskLevel {
  const { stockAfterRatio, marginAfterPct, discount } = opts;
  if (stockAfterRatio < 0.35 || marginAfterPct < 5) return "High";
  if (stockAfterRatio < 0.6 || marginAfterPct < 12 || discount >= 20) return "Medium";
  return "Low";
}

export interface SegmentMetrics {
  segment: Segment;
  customers: number;
  topCategory: string;
  avgMonthlySpend: number;
  purchaseFrequency: number;
  avgAge: number;
}

export function segmentMetrics(segment: Segment, all: Customer[]): SegmentMetrics {
  const group = all.filter((c) => c.segment === segment);
  const avg = (f: (c: Customer) => number) => group.reduce((s, c) => s + f(c), 0) / (group.length || 1);
  const counts = new Map<string, number>();
  group.forEach((c) => counts.set(c.preferredCategory, (counts.get(c.preferredCategory) ?? 0) + 1));
  const topCategory = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-";
  return {
    segment,
    customers: group.length,
    topCategory,
    avgMonthlySpend: avg((c) => c.avgMonthlySpend),
    purchaseFrequency: avg((c) => c.purchaseFrequency),
    avgAge: avg((c) => c.age),
  };
}
