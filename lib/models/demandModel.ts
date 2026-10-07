// Deterministic stub — replace with trained model via API later.
//
// Demand model: predicted units for ONE segment in ONE city over the planning window.
//   baseline  = what the segment buys with no promotion
//   promoted  = what it buys when the contacted share of it gets the discount
//
// Inputs are plain numbers, so a trained model can take the same features.
// TODO: flip to the FastAPI service (ml/server.py): POST the same fields, read the same fields back.

import { REFERENCE_RESPONSE } from "./responseModel";

export interface DemandInput {
  /** Units per day, all segments, no promotion */
  dailySalesRate: number;
  horizonDays: number;
  /** This segment's share of the product's sales in this city (0–1) */
  segmentShare: number;
  /** Month / festival multiplier for this category */
  seasonMultiplier: number;
  /** Category price response */
  elasticity: number;
  /** 0–1 */
  priceSensitivity: number;
  discountPct: number;
  /** From the response model */
  responseProbability: number;
  /** Share of the segment that is contacted (0–1) */
  coverage: number;
}

export interface DemandOutput {
  /** Segment units with no promotion */
  baselineUnits: number;
  /** Extra demand from the discount on the contacted share, as a fraction (0.4 = +40%) */
  lift: number;
  /** Segment units with the promotion */
  promotedUnits: number;
  incrementalUnits: number;
}

/** Demand response to a discount, with diminishing returns. */
export function liftFraction(discountPct: number, elasticity: number, priceSensitivity: number): number {
  const d = discountPct / 100;
  return (elasticity * priceSensitivity * d) / (1 + 2 * d);
}

export function demandModel(input: DemandInput): DemandOutput {
  const baselineUnits = input.dailySalesRate * input.horizonDays * input.seasonMultiplier * input.segmentShare;
  const lift =
    liftFraction(input.discountPct, input.elasticity, input.priceSensitivity) * (input.responseProbability / REFERENCE_RESPONSE);
  const incrementalUnits = baselineUnits * input.coverage * lift;
  return { baselineUnits, lift, promotedUnits: baselineUnits + incrementalUnits, incrementalUnits };
}
