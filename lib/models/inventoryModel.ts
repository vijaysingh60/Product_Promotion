// Deterministic stub — replace with trained model via API later.
//
// Inventory model: given a stock position and the demand expected on it, how much can be served?
// Demand is uncertain (normal, coefficient of variation `demandCv`), so a stockout is a probability,
// not a yes/no. Safety stock is never sold: only `safeUnits` can be served.

import type { EngineConfig, StockStatus } from "../../types";

export interface InventoryInput {
  stock: number;
  safetyStockPct: number;
  /** Expected demand on this position over the horizon, all segments and promotions included */
  expectedDemand: number;
  /** Units per day with no promotion, used for days of cover */
  dailyDemand: number;
  demandCv: number;
}

export interface InventoryOutput {
  safetyStock: number;
  /** stock − safety stock: what may be sold */
  safeUnits: number;
  daysOfCover: number;
  /** P(demand > safe units) */
  stockoutProbability: number;
  expectedSold: number;
  expectedLost: number;
  /** expectedSold ÷ expectedDemand (1 when nothing is lost) */
  soldRatio: number;
  remainingStock: number;
  daysOfCoverAfter: number;
}

// Standard normal helpers (Abramowitz–Stegun erf approximation).
const pdf = (z: number) => Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
function cdf(z: number): number {
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const erf = 1 - poly * Math.exp(-x * x);
  return z >= 0 ? 0.5 * (1 + erf) : 0.5 * (1 - erf);
}

export function inventoryModel(input: InventoryInput): InventoryOutput {
  const safetyStock = Math.round((input.stock * input.safetyStockPct) / 100);
  const safeUnits = Math.max(0, input.stock - safetyStock);
  const mean = input.expectedDemand;
  const daysOfCover = input.dailyDemand > 0 ? input.stock / input.dailyDemand : Infinity;

  let stockoutProbability = 0;
  let expectedLost = 0;
  if (mean > 0) {
    const sigma = Math.max(input.demandCv * mean, 1e-9);
    const z = (safeUnits - mean) / sigma;
    stockoutProbability = 1 - cdf(z);
    expectedLost = sigma * (pdf(z) - z * (1 - cdf(z))); // E[(D − safe)+]
  }
  const expectedSold = Math.max(0, mean - expectedLost);
  const remainingStock = Math.max(safetyStock, input.stock - expectedSold);
  return {
    safetyStock,
    safeUnits,
    daysOfCover,
    stockoutProbability,
    expectedSold,
    expectedLost,
    soldRatio: mean > 0 ? expectedSold / mean : 1,
    remainingStock,
    daysOfCoverAfter: input.dailyDemand > 0 ? remainingStock / input.dailyDemand : Infinity,
  };
}

type StockThresholds = Pick<EngineConfig, "stockoutRiskCoverDays" | "lowCoverDays" | "overstockCoverDays">;

export function classifyStock(daysOfCover: number, t: StockThresholds): StockStatus {
  if (daysOfCover < t.stockoutRiskCoverDays) return "Stockout risk";
  if (daysOfCover < t.lowCoverDays) return "Low";
  if (daysOfCover > t.overstockCoverDays) return "Overstock";
  return "Healthy";
}
