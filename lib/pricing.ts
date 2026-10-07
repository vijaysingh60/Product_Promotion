// Hard price rules. Pure functions: CP and MRP in, legal discount band out.
//
//   offer price ≥ CP × (1 + margin floor)      (default floor: 5%)
//   offer price ≤ MRP
//   max discount % = (MRP − CP × (1 + floor)) / MRP
//
// The engine may only search discounts inside this band. Nothing else in the app computes legality.

import type { PriceBand } from "../types";

const EPS = 1e-9;

export interface PricingRules {
  marginFloorPct: number;
  discountStep: number;
}

export const offerPrice = (mrp: number, discountPct: number) => mrp * (1 - discountPct / 100);

/** Margin the offer price leaves over cost, percent of the offer price. */
export const marginAtOfferPct = (costPrice: number, offer: number) => ((offer - costPrice) / offer) * 100;

export function priceBand(costPrice: number, mrp: number, rules: PricingRules): PriceBand {
  const minOfferPrice = costPrice * (1 + rules.marginFloorPct / 100);
  const maxDiscountPct = ((mrp - minOfferPrice) / mrp) * 100;
  const steps = maxDiscountPct < rules.discountStep ? 0 : Math.floor(maxDiscountPct / rules.discountStep + EPS);
  const discounts = Array.from({ length: steps }, (_, i) => Math.round((i + 1) * rules.discountStep * 100) / 100);
  return {
    costPrice,
    mrp,
    minOfferPrice,
    maxOfferPrice: mrp,
    maxDiscountPct,
    isEmpty: discounts.length === 0,
    discounts,
  };
}

/** True when the offer price at this discount respects both the CP floor and the MRP cap. */
export function isLegalDiscount(band: PriceBand, discountPct: number): boolean {
  if (discountPct < 0) return false;
  const offer = offerPrice(band.mrp, discountPct);
  return offer >= band.minOfferPrice - EPS && offer <= band.maxOfferPrice + EPS;
}

/** The deepest discount on the grid that is still legal (0 when the band is empty). */
export const maxLegalGridDiscount = (band: PriceBand) => band.discounts[band.discounts.length - 1] ?? 0;
