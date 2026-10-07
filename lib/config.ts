// Every tunable business rule in one object. Change a number here and the whole plan recomputes.

import type { EngineConfig } from "../types";

export const DEFAULT_CONFIG: EngineConfig = {
  marginFloorPct: 5, // offer price ≥ CP × 1.05
  safetyStockPct: 15, // held back from promotions
  costPerContact: 3, // ₹ per customer contacted
  marketingBudget: 200_000, // ₹ for the whole plan
  discountStep: 2.5,
  stockCapPct: 80, // expected buyers ≤ 80% of safe units
  horizonDays: 30,
  planningMonth: 10, // October: festive run-up
  demandCv: 0.25,
  stockoutPenalty: 0.5,
  minAudience: 50,
  stockoutRiskCoverDays: 30,
  lowCoverDays: 60,
  overstockCoverDays: 100,
  holdingCostPctPerMonth: 2,
};

/** The four settings exposed in the UI, with the range each one accepts. */
export const TUNABLE: { key: keyof EngineConfig; label: string; unit: string; min: number; max: number; step: number }[] = [
  { key: "marginFloorPct", label: "Margin floor", unit: "% over CP", min: 0, max: 30, step: 0.5 },
  { key: "safetyStockPct", label: "Safety stock", unit: "% of stock", min: 0, max: 50, step: 1 },
  { key: "costPerContact", label: "Promo cost", unit: "₹ per contact", min: 0, max: 50, step: 0.5 },
  { key: "marketingBudget", label: "Marketing budget", unit: "₹", min: 0, max: 5_000_000, step: 10_000 },
];

export const CONFIG_COOKIE = "pp_config";

/** Merge user overrides (from the cookie) onto the defaults, ignoring anything out of range. */
export function parseConfig(raw: string | undefined | null): EngineConfig {
  const config = { ...DEFAULT_CONFIG };
  if (!raw) return config;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    for (const t of TUNABLE) {
      const v = parsed[t.key];
      if (typeof v === "number" && Number.isFinite(v) && v >= t.min && v <= t.max) config[t.key] = v;
    }
  } catch {
    /* corrupt cookie → defaults */
  }
  return config;
}
