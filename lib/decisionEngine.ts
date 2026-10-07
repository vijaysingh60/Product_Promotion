// Decision engine: turns data + models + business rules into a plan. Pure and deterministic —
// no React, no I/O — so it can be run from a script (scripts/verify.mts) or swapped model by model.
//
// For every product × segment × city:
//   1. legal discount band from CP and MRP                      (pricing.ts)
//   2. grid-search the band in 2.5-point steps
//   3. per discount: response + demand + inventory models       (models/*)
//   4. baseline vs promoted → incremental revenue and profit
//   5. cap units sold by safe stock, count units lost to stockout
//   6. apply the fatigue penalty (inside the response model)
//   7. drop anything illegal or without an audience
//   8. pick the best incremental profit, penalised by stockout risk
//   9. verdict: PROMOTE / DON'T PROMOTE / PROMOTE ALTERNATIVE (alternatives only for rejected rows)
//  10. reasons, risks and a plain-language explanation
// Then the budget allocator fills the marketing budget greedily by incremental profit per ₹ of promo cost,
// deducting stock as it goes so two segments never claim the same units.

import { buildId, CATEGORY_ELASTICITY, CITIES, getInventory, getProduct, getSegmentProfile, historyFor, inventory, products, seasonFor, SEGMENTS, segmentSizes } from "./mockData";
import { formatINR, formatNumber } from "./format";
import { isLegalDiscount, marginAtOfferPct, offerPrice, priceBand } from "./pricing";
import { demandModel, type DemandInput } from "./models/demandModel";
import { classifyStock, inventoryModel, type InventoryOutput } from "./models/inventoryModel";
import { responseModel } from "./models/responseModel";
import type {
  AlternativePick, City, DiscountOption, EngineConfig, EvalState, Factors, InventoryRow, Plan, PlanRow, Product,
  PromotionKind, Recommendation, RejectionCode, RiskLevel, Segment, SegmentProfile, UnfundedCode,
} from "../types";

export interface CandidateKey {
  productId: string;
  segment: Segment;
  city: City;
}

export type { EvalState };
export const FRESH_STATE: EvalState = { committedUnits: 0, extraContacts: 0 };

export const REJECTION_HEADLINE: Record<RejectionCode, string> = {
  NO_PROFITABLE_DISCOUNT: "No profitable discount available",
  PROTECT_STOCK: "Protect stock",
  BOUGHT_ANYWAY: "Customers would have bought anyway",
  COST_EXCEEDS_PROFIT: "Promo cost exceeds the extra profit",
};
export const UNFUNDED_HEADLINE: Record<UnfundedCode, string> = {
  BUDGET_EXHAUSTED: "Not funded: marketing budget used up",
  STOCK_COMMITTED: "Not funded: stock already committed to other promotions",
  SEGMENT_FATIGUE: "Not funded: segment already contacted by other promotions",
};

// ------------------------------------------------------------------ context
interface Context {
  cfg: EngineConfig;
  key: CandidateKey;
  product: Product;
  profile: SegmentProfile;
  stock: number;
  leadTimeDays: number;
  band: ReturnType<typeof priceBand>;
  season: { label: string; multiplier: number };
  segmentSize: number;
  segmentShare: number;
  elasticity: number;
  history: { avgUpliftPct: number | null; campaigns: number };
  /** Units per day, season included */
  dailyRate: number;
  /** Units over the horizon, all segments, no promotion */
  baselineAll: number;
  baseInv: InventoryOutput;
  affinity: number;
  intent: number;
  kind: PromotionKind;
}

function buildContext(key: CandidateKey, cfg: EngineConfig): Context {
  const product = getProduct(key.productId);
  const inv = getInventory(key.productId, key.city);
  const profile = getSegmentProfile(key.segment);
  if (!product || !inv || !profile) throw new Error(`Unknown candidate: ${key.productId} / ${key.segment} / ${key.city}`);

  const season = seasonFor(cfg.planningMonth, product.category);
  const dailyRate = inv.dailySalesRate * season.multiplier;
  const baselineAll = dailyRate * cfg.horizonDays;

  // This segment's share of the product's sales in the city ∝ customers × affinity.
  const weight = (s: Segment) => segmentSizes[key.city][s] * (getSegmentProfile(s)?.affinity[product.category] ?? 0);
  const total = SEGMENTS.reduce((sum, s) => sum + weight(s), 0);

  const baseInv = inventoryModel({
    stock: inv.stock,
    safetyStockPct: cfg.safetyStockPct,
    expectedDemand: baselineAll,
    dailyDemand: dailyRate,
    demandCv: cfg.demandCv,
  });
  return {
    cfg,
    key,
    product,
    profile,
    stock: inv.stock,
    leadTimeDays: inv.leadTimeDays,
    band: priceBand(product.costPrice, product.mrp, cfg),
    season,
    segmentSize: segmentSizes[key.city][key.segment],
    segmentShare: total > 0 ? weight(key.segment) / total : 0,
    elasticity: CATEGORY_ELASTICITY[product.category],
    history: historyFor(key.productId, key.segment),
    dailyRate,
    baselineAll,
    baseInv,
    affinity: profile.affinity[product.category],
    intent: profile.intent[product.category],
    kind: baseInv.daysOfCover > cfg.overstockCoverDays ? "clearance" : "standard",
  };
}

/** Risk from stockout probability, margin left, discount depth and whether a restock would arrive in time. */
function riskFor(a: { stockoutProbability: number; marginPct: number; discountPct: number; daysOfCoverAfter: number; leadTimeDays: number }): RiskLevel {
  if (a.stockoutProbability >= 0.3 || a.marginPct < 8 || a.daysOfCoverAfter < a.leadTimeDays) return "High";
  if (a.stockoutProbability >= 0.1 || a.marginPct < 15 || a.discountPct >= 20 || a.daysOfCoverAfter < a.leadTimeDays + 14) return "Medium";
  return "Low";
}

// ------------------------------------------------------- one discount option
/** Evaluate one discount for one candidate. Works for illegal discounts too (flagged `legal: false`) so curves can show them. */
export function evaluateOption(ctx: Context, discountPct: number, state: EvalState = FRESH_STATE): DiscountOption {
  const { cfg, product: p } = ctx;
  const offer = offerPrice(p.mrp, discountPct);
  const legal = isLegalDiscount(ctx.band, discountPct);

  const response = responseModel({
    affinity: ctx.affinity,
    intent: ctx.intent,
    historicalUpliftPct: ctx.history.avgUpliftPct,
    historicalCampaigns: ctx.history.campaigns,
    recentContacts: ctx.profile.recentContacts + state.extraContacts,
  });
  const demandBase: Omit<DemandInput, "coverage"> = {
    dailySalesRate: getInventory(p.id, ctx.key.city)!.dailySalesRate,
    horizonDays: cfg.horizonDays,
    segmentShare: ctx.segmentShare,
    seasonMultiplier: ctx.season.multiplier,
    elasticity: ctx.elasticity,
    priceSensitivity: ctx.profile.priceSensitivity,
    discountPct,
    responseProbability: response.probability,
  };

  // ── audience sizing: expected buyers may use at most stockCapPct of the safe units ──
  const full = demandModel({ ...demandBase, coverage: 1 });
  const cap = (cfg.stockCapPct / 100) * ctx.baseInv.safeUnits;
  const headroomFree = cap - ctx.baselineAll; // before other promotions
  const headroom = headroomFree - state.committedUnits;
  const coverageFor = (h: number) => (full.incrementalUnits <= 0 ? 1 : h <= 0 ? 0 : Math.min(1, h / full.incrementalUnits));
  const coverStockFree = coverageFor(headroomFree);
  const coverStock = coverageFor(headroom);
  const coverBudget = state.maxAudience === undefined ? 1 : Math.min(1, state.maxAudience / ctx.segmentSize);

  let coverage = Math.min(coverStock, coverBudget);
  let audience = Math.floor(coverage * ctx.segmentSize);
  const viable = audience >= cfg.minAudience;
  if (!viable) {
    coverage = 0;
    audience = 0;
  }
  const limits = {
    stockCapped: coverStockFree < 1,
    committedReduced: coverStock < coverStockFree - 1e-9,
    budgetCapped: coverBudget < coverStock - 1e-9,
  };

  // ── demand and stock for the chosen audience ──
  const promo = demandModel({ ...demandBase, coverage });
  const B = promo.baselineUnits;
  const totalDemand = ctx.baselineAll + state.committedUnits + promo.incrementalUnits;
  const invP = inventoryModel({
    stock: ctx.stock,
    safetyStockPct: cfg.safetyStockPct,
    expectedDemand: totalDemand,
    dailyDemand: ctx.dailyRate,
    demandCv: cfg.demandCv,
  });
  const rhoP = invP.soldRatio;
  const rhoB = ctx.baseInv.soldRatio;

  // ── baseline vs promoted (returns netted out: a returned unit earns nothing) ──
  const keep = 1 - p.returnRate;
  const M = p.mrp;
  const C = p.costPrice;
  const L = promo.lift;
  const baselineRevenue = keep * rhoB * B * M;
  const baselineProfit = keep * rhoB * B * (M - C);
  const promotedRevenue = keep * rhoP * (B * (1 - coverage) * M + B * coverage * (1 + L) * offer);
  const promotedProfit = keep * rhoP * (B * (1 - coverage) * (M - C) + B * coverage * (1 + L) * (offer - C));

  const bridge = {
    volume: keep * rhoP * B * coverage * L * (offer - C),
    giveaway: keep * rhoP * B * coverage * (offer - M),
    stockLoss: keep * (rhoP - rhoB) * B * (M - C),
    promoCost: -audience * cfg.costPerContact,
    clearance: 0,
  };
  const promotedUnits = promo.promotedUnits;
  const unitsServable = promotedUnits * rhoP;

  // Clearance only: cleared units stop costing holding money.
  if (ctx.kind === "clearance") {
    const monthsOver = Math.min(6, Math.max(0, (ctx.baseInv.daysOfCover - cfg.overstockCoverDays) / 30) + 1);
    bridge.clearance = promo.incrementalUnits * rhoP * C * (cfg.holdingCostPctPerMonth / 100) * monthsOver;
  }

  const incrementalProfitBeforeCost = promotedProfit - baselineProfit;
  const incrementalProfit = incrementalProfitBeforeCost + bridge.promoCost + bridge.clearance;
  const marginPct = marginAtOfferPct(C, offer);
  const risk = riskFor({
    stockoutProbability: invP.stockoutProbability,
    marginPct,
    discountPct,
    daysOfCoverAfter: invP.daysOfCoverAfter,
    leadTimeDays: ctx.leadTimeDays,
  });

  return {
    discountPct,
    offerPrice: offer,
    legal,
    viable,
    marginAtOfferPct: marginPct,
    coverage,
    audience,
    segmentSize: ctx.segmentSize,
    limits,
    responseProbability: response.probability,
    fatiguePenalty: response.fatiguePenalty,
    liftPct: L * 100,
    baselineUnits: B,
    promotedUnits,
    incrementalUnits: promo.incrementalUnits,
    unitsServable,
    unitsLost: promotedUnits - unitsServable,
    baselineRevenue,
    baselineProfit,
    promotedRevenue,
    promotedProfit,
    incrementalRevenue: promotedRevenue - baselineRevenue,
    incrementalProfitBeforeCost,
    promoCost: audience * cfg.costPerContact,
    clearanceValue: bridge.clearance,
    incrementalProfit,
    roi: incrementalProfitBeforeCost / Math.max(audience * cfg.costPerContact, 1),
    bridge,
    stockoutProbability: invP.stockoutProbability,
    remainingStock: invP.remainingStock,
    daysOfCoverAfter: invP.daysOfCoverAfter,
    risk,
    objective: incrementalProfit - cfg.stockoutPenalty * invP.stockoutProbability * Math.max(promotedProfit, 0),
  };
}

// ------------------------------------------------------------ one candidate
export function evaluateCandidate(key: CandidateKey, cfg: EngineConfig, state: EvalState = FRESH_STATE): Recommendation {
  const ctx = buildContext(key, cfg);
  return decide(ctx, state);
}

function decide(ctx: Context, state: EvalState): Recommendation {
  const { cfg, product: p, band, key } = ctx;
  const options = band.discounts.map((d) => evaluateOption(ctx, d, state)).filter((o) => o.legal && o.viable);
  const best = options.length > 0 ? options.reduce((a, b) => (b.objective > a.objective ? b : a)) : null;

  let verdict: Recommendation["verdict"] = "PROMOTE";
  let rejection: Recommendation["rejection"] = null;
  const reject = (code: RejectionCode, detail: string) => {
    verdict = "DON'T PROMOTE";
    rejection = { code, headline: REJECTION_HEADLINE[code], detail };
  };

  if (band.isEmpty) {
    reject(
      "NO_PROFITABLE_DISCOUNT",
      `Offer price must stay at or above ${formatINR(band.minOfferPrice)} (cost ${formatINR(band.costPrice)} + ${cfg.marginFloorPct}%), ` +
        `but MRP is ${formatINR(band.mrp)}. The deepest legal discount is ${Math.max(0, band.maxDiscountPct).toFixed(1)}%, below the ${cfg.discountStep}% step.`,
    );
  } else if (!best) {
    const used = ctx.baseInv.safeUnits > 0 ? (ctx.baselineAll / ctx.baseInv.safeUnits) * 100 : Infinity;
    reject(
      "PROTECT_STOCK",
      ctx.baseInv.safeUnits <= 0
        ? `No safe units left after holding back ${ctx.baseInv.safetyStock} units of safety stock in ${key.city}.`
        : `Normal sales already use ${Number.isFinite(used) ? Math.round(used) : "all"}% of the ${formatNumber(ctx.baseInv.safeUnits)} safe units in ${key.city}; ` +
            `the ${cfg.stockCapPct}% cap leaves no stock to promote.`,
    );
  } else if (best.incrementalProfitBeforeCost < 0) {
    reject(
      "BOUGHT_ANYWAY",
      `Even the best discount (${best.discountPct}%) loses ${formatINR(-best.incrementalProfitBeforeCost)}: the extra units do not make up for the margin given ` +
        `to customers who would have bought at full price.`,
    );
  } else if (best.incrementalProfit < 0) {
    reject(
      "COST_EXCEEDS_PROFIT",
      `The best discount (${best.discountPct}%) adds ${formatINR(best.incrementalProfitBeforeCost)} of profit but contacting ${formatNumber(best.audience)} customers costs ${formatINR(best.promoCost)}.`,
    );
  }

  const chosen = best;
  // With no usable option the risk shown is the position's own: what happens if we do nothing.
  const risk: RiskLevel = chosen
    ? chosen.risk
    : riskFor({
        stockoutProbability: ctx.baseInv.stockoutProbability,
        marginPct: Infinity,
        discountPct: 0,
        daysOfCoverAfter: ctx.baseInv.daysOfCoverAfter,
        leadTimeDays: ctx.leadTimeDays,
      });
  const text = narrate(ctx, chosen, verdict, rejection);
  const B = ctx.baselineAll * ctx.segmentShare;
  const keep = 1 - p.returnRate;
  const stockStatus = classifyStock(ctx.baseInv.daysOfCover, cfg);

  return {
    id: buildId(key.productId, key.segment, key.city),
    productId: p.id,
    productName: p.name,
    category: p.category,
    segment: key.segment,
    city: key.city,
    kind: ctx.kind,
    verdict,
    status: verdict === "PROMOTE" ? "funded" : "rejected",
    rejection,
    unfunded: null,
    band,
    evalState: state,
    chosen,
    options,
    alternative: null,
    stock: ctx.stock,
    safetyStock: ctx.baseInv.safetyStock,
    safeUnits: ctx.baseInv.safeUnits,
    daysOfCover: ctx.baseInv.daysOfCover,
    stockStatus,
    baselineUnits: B,
    baselineProfit: keep * ctx.baseInv.soldRatio * B * (p.mrp - p.costPrice),
    baselineRevenue: keep * ctx.baseInv.soldRatio * B * p.mrp,
    segmentSize: ctx.segmentSize,
    factors: factorsFor(ctx, chosen),
    reasons: text.reasons,
    risks: text.risks,
    notes: text.notes,
    explanation: text.explanation,
    risk,
  };
}

const clamp100 = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 100);

function factorsFor(ctx: Context, o: DiscountOption | null): Factors {
  const resp = o ?? evaluateOption(ctx, ctx.band.discounts[0] ?? ctx.cfg.discountStep);
  return {
    response: clamp100(resp.responseProbability),
    demand: clamp100(resp.liftPct / 80),
    stockHealth: clamp100((ctx.baseInv.daysOfCover - ctx.cfg.stockoutRiskCoverDays) / 60),
    margin: clamp100((o ? o.marginAtOfferPct : ctx.band.mrp > 0 ? ((ctx.band.mrp - ctx.band.costPrice) / ctx.band.mrp) * 100 : 0) / 40),
    fatigue: clamp100(resp.fatiguePenalty / 0.4),
  };
}

// ---------------------------------------------------------------- narrative
function narrate(
  ctx: Context,
  o: DiscountOption | null,
  verdict: Recommendation["verdict"],
  rejection: Recommendation["rejection"],
) {
  const { product: p, key, cfg } = ctx;
  const reasons: string[] = [];
  const risks: string[] = [];
  const notes: string[] = [];
  const who = `${key.segment} in ${key.city}`;

  if (!o) {
    // Rejected before any option was viable.
    if (rejection?.code === "NO_PROFITABLE_DISCOUNT") {
      risks.push(`Margin at MRP is only ${p.margin.toFixed(1)}%; the ${cfg.marginFloorPct}% floor leaves no room for a discount`);
    } else {
      risks.push(`Safety stock (${ctx.baseInv.safetyStock} units) and normal sales leave too little to promote`);
      risks.push(`${ctx.baseInv.daysOfCover.toFixed(0)} days of cover at the current sales rate`);
    }
    reasons.push(`${key.segment} affinity for ${p.category} is ${Math.round(ctx.affinity * 100)}/100, but the constraint above blocks the promotion`);
    return {
      reasons,
      risks,
      notes,
      explanation: `Don't promote ${p.name} to ${who}. ${rejection?.detail ?? ""}`.trim(),
    };
  }

  const stockShare = ctx.baseInv.safeUnits > 0 ? ((ctx.baselineAll + o.incrementalUnits) / ctx.baseInv.safeUnits) * 100 : 100;
  reasons.push(
    `${key.segment} respond well to ${p.category}: affinity ${Math.round(ctx.affinity * 100)}/100, recent intent ${Math.round(ctx.intent * 100)}/100 → ${Math.round(o.responseProbability * 100)}% response`,
  );
  reasons.push(
    ctx.history.avgUpliftPct === null
      ? "No past campaign for this product and segment — a neutral prior was used"
      : `Past campaigns on this product for ${key.segment} averaged +${Math.round(ctx.history.avgUpliftPct)}% sales uplift (${ctx.history.campaigns} campaign${ctx.history.campaigns > 1 ? "s" : ""})`,
  );
  reasons.push(`Stock supports it: expected buyers use ${Math.round(stockShare)}% of the ${formatNumber(ctx.baseInv.safeUnits)} safe units in ${key.city} (cap ${cfg.stockCapPct}%)`);
  reasons.push(`Offer ${formatINR(o.offerPrice)} (MRP ${formatINR(p.mrp)}) keeps a ${o.marginAtOfferPct.toFixed(1)}% margin; the floor is ${cfg.marginFloorPct}% over cost`);
  if (ctx.kind === "clearance") {
    reasons.push(`Overstocked: ${Math.round(ctx.baseInv.daysOfCover)} days of cover — clearing units releases about ${formatINR(o.clearanceValue)} of holding cost`);
  }

  if (o.stockoutProbability >= 0.1) risks.push(`${Math.round(o.stockoutProbability * 100)}% chance demand exceeds safe stock — about ${Math.max(1, Math.round(o.unitsLost))} unit${Math.round(o.unitsLost) > 1 ? "s" : ""} could be lost`);
  if (o.limits.stockCapped) {
    risks.push(`Audience limited to ${formatNumber(o.audience)} of ${formatNumber(o.segmentSize)} customers (${Math.round(o.coverage * 100)}%) to protect stock`);
    notes.push(`audience capped: expected buyers stay within ${cfg.stockCapPct}% of safe units in ${key.city}`);
  }
  if (o.fatiguePenalty >= 0.12) risks.push(`Message fatigue: recent contacts cut response by ${Math.round(o.fatiguePenalty * 100)} points`);
  if (o.marginAtOfferPct < 12) risks.push(`Thin margin after discount (${o.marginAtOfferPct.toFixed(1)}%)`);
  if (ctx.season.multiplier >= 1.2) risks.push(`${ctx.season.label}: baseline sales are already high, so more buyers would purchase at full price anyway`);
  if (o.discountPct >= 20) risks.push("Deep discount may train customers to wait for sales");
  if (risks.length === 0) risks.push("Demand may be higher than predicted; monitor stock daily");

  let explanation: string;
  if (verdict === "PROMOTE") {
    explanation =
      `Offer ${who} ${o.discountPct}% off ${p.name} (${formatINR(o.offerPrice)} instead of ${formatINR(p.mrp)}). ` +
      `Contact ${formatNumber(o.audience)} customers; expect about ${formatNumber(o.incrementalUnits)} extra units on top of ${formatNumber(o.baselineUnits * o.coverage)} they would buy anyway. ` +
      `That adds ${formatINR(o.incrementalProfitBeforeCost)} of profit, or ${formatINR(o.incrementalProfit)} after ${formatINR(o.promoCost)} of promo cost` +
      (ctx.kind === "clearance" ? " and the value of clearing excess stock." : ".");
  } else if (rejection?.code === "BOUGHT_ANYWAY") {
    explanation =
      `Don't promote ${p.name} to ${who}: customers would have bought anyway. At the best discount (${o.discountPct}%) the promotion earns ` +
      `${formatINR(o.incrementalProfitBeforeCost)} versus doing nothing, because margin given to existing buyers outweighs the ${formatNumber(o.incrementalUnits)} extra units.`;
  } else {
    explanation = `Don't promote ${p.name} to ${who}. ${rejection?.detail ?? ""}`.trim();
  }
  return { reasons, risks, notes, explanation };
}

// ---------------------------------------------------------- discount curve
/** Profit versus discount, including discounts below the margin floor (flagged illegal) — for charts. Pass the recommendation's own `evalState` to redraw the curve it was decided on. */
export function discountCurve(key: CandidateKey, cfg: EngineConfig, state: EvalState = FRESH_STATE, maxPct = 40): DiscountOption[] {
  const ctx = buildContext(key, cfg);
  // Always reach the deepest legal discount, even when it is beyond `maxPct` (high-margin products).
  const top = Math.max(maxPct, ctx.band.discounts[ctx.band.discounts.length - 1] ?? 0);
  const points: DiscountOption[] = [];
  for (let d = cfg.discountStep; d <= top + 1e-9; d += cfg.discountStep) points.push(evaluateOption(ctx, Math.round(d * 100) / 100, state));
  return points;
}

// ----------------------------------------------------------------- the plan
const pcKey = (productId: string, city: City) => `${productId}|${city}`;
const scKey = (segment: Segment, city: City) => `${segment}|${city}`;

export function buildPlan(cfg: EngineConfig): Plan {
  const keys: CandidateKey[] = [];
  for (const product of products) for (const city of CITIES) for (const segment of SEGMENTS) keys.push({ productId: product.id, segment, city });

  // Pass 1: every candidate on its own.
  const first = keys.map((k) => evaluateCandidate(k, cfg));
  const final = new Map<string, Recommendation>(first.map((r) => [r.id, r]));

  // Pass 2: budget allocator, best incremental profit per ₹ of promo cost first, stock-aware.
  const queue = first
    .filter((r) => r.verdict === "PROMOTE" && r.chosen)
    .sort((a, b) => b.chosen!.roi - a.chosen!.roi || b.chosen!.incrementalProfit - a.chosen!.incrementalProfit);

  const committed = new Map<string, number>();
  const contacts = new Map<string, number>();
  let remaining = cfg.marketingBudget;
  let used = 0;

  for (const r of queue) {
    const key = { productId: r.productId, segment: r.segment, city: r.city };
    const priorUnits = committed.get(pcKey(r.productId, r.city)) ?? 0;
    const priorContacts = contacts.get(scKey(r.segment, r.city)) ?? 0;
    const maxAudience = cfg.costPerContact > 0 ? Math.floor(remaining / cfg.costPerContact) : undefined;

    if (maxAudience !== undefined && maxAudience < cfg.minAudience) {
      final.set(r.id, markUnfunded(r, "BUDGET_EXHAUSTED"));
      continue;
    }
    const re = evaluateCandidate(key, cfg, { committedUnits: priorUnits, extraContacts: priorContacts, maxAudience });
    if (re.verdict !== "PROMOTE" || !re.chosen) {
      const code: UnfundedCode =
        priorUnits > 0 && re.rejection?.code === "PROTECT_STOCK" ? "STOCK_COMMITTED" : priorContacts > 0 ? "SEGMENT_FATIGUE" : "BUDGET_EXHAUSTED";
      final.set(r.id, markUnfunded(r, code));
      continue;
    }

    const ch = re.chosen;
    if (ch.limits.committedReduced) {
      re.notes.push(`audience reduced: ${formatNumber(priorUnits)} units already committed in ${r.city}`);
    }
    if (ch.limits.budgetCapped) re.notes.push(`audience reduced to fit the remaining budget (${formatINR(remaining)})`);
    if (priorContacts > 0) {
      re.notes.push(`response lowered by fatigue: ${priorContacts} other campaign${priorContacts > 1 ? "s" : ""} already planned for ${r.segment} in ${r.city}`);
    }
    final.set(r.id, re);
    committed.set(pcKey(r.productId, r.city), priorUnits + ch.incrementalUnits);
    contacts.set(scKey(r.segment, r.city), priorContacts + 1);
    remaining -= ch.promoCost;
    used += ch.promoCost;
  }

  // Alternatives: only for rejected candidates — the best PROMOTE candidate from the same category, city and segment.
  const promotable = first.filter((r) => r.verdict === "PROMOTE" && r.chosen);
  const best = new Map<string, Recommendation[]>();
  for (const r of promotable) {
    const k = `${r.category}|${r.city}|${r.segment}`;
    best.set(k, [...(best.get(k) ?? []), r].sort((a, b) => b.chosen!.incrementalProfit - a.chosen!.incrementalProfit));
  }
  for (const r of first) {
    if (r.verdict !== "DON'T PROMOTE") continue;
    const alt = (best.get(`${r.category}|${r.city}|${r.segment}`) ?? []).find((a) => a.productId !== r.productId);
    if (!alt?.chosen) continue;
    const pick: AlternativePick = {
      productId: alt.productId,
      productName: alt.productName,
      discountPct: alt.chosen.discountPct,
      incrementalProfit: alt.chosen.incrementalProfit,
      funded: final.get(alt.id)?.status === "funded",
    };
    final.set(r.id, { ...final.get(r.id)!, verdict: "PROMOTE ALTERNATIVE", alternative: pick });
  }

  const candidates = [...final.values()];
  return {
    config: cfg,
    candidates,
    rows: candidates.map(toRow),
    inventoryRows: buildInventoryRows(cfg, committed),
    budget: { total: cfg.marketingBudget, used },
  };
}

function markUnfunded(r: Recommendation, code: UnfundedCode): Recommendation {
  return { ...r, status: "unfunded", unfunded: { code, headline: UNFUNDED_HEADLINE[code] } };
}

export function toRow(r: Recommendation): PlanRow {
  const o = r.chosen;
  const funded = r.status === "funded";
  return {
    id: r.id,
    productId: r.productId,
    productName: r.productName,
    category: r.category,
    segment: r.segment,
    city: r.city,
    kind: r.kind,
    verdict: r.verdict,
    status: r.status,
    discountPct: o?.discountPct ?? null,
    audience: o?.audience ?? 0,
    segmentSize: r.segmentSize,
    predictedDemand: o?.promotedUnits ?? r.baselineUnits,
    unitsServable: o?.unitsServable ?? 0,
    unitsLost: o?.unitsLost ?? 0,
    baselineUnits: r.baselineUnits,
    baselineProfit: r.baselineProfit,
    incrementalProfit: o?.incrementalProfit ?? 0,
    incrementalRevenue: o?.incrementalRevenue ?? 0,
    promoCost: o?.promoCost ?? 0,
    roi: o?.roi ?? 0,
    bridge: funded && o ? o.bridge : { volume: 0, giveaway: 0, stockLoss: 0, promoCost: 0, clearance: 0 },
    risk: r.risk,
    stock: r.stock,
    safeUnits: r.safeUnits,
    reason: r.rejection?.headline ?? r.unfunded?.headline ?? null,
    reasonCode: r.rejection?.code ?? r.unfunded?.code ?? null,
    detail: r.rejection?.detail ?? null,
    notes: r.notes,
    alternative: r.alternative,
  };
}

function buildInventoryRows(cfg: EngineConfig, committed: Map<string, number>): InventoryRow[] {
  return inventory.map((i) => {
    const product = getProduct(i.productId)!;
    const season = seasonFor(cfg.planningMonth, product.category);
    const dailyDemand = i.dailySalesRate * season.multiplier;
    const predictedDemand = dailyDemand * cfg.horizonDays;
    const plannedUnits = committed.get(pcKey(i.productId, i.city)) ?? 0;
    const now = inventoryModel({ stock: i.stock, safetyStockPct: cfg.safetyStockPct, expectedDemand: predictedDemand, dailyDemand, demandCv: cfg.demandCv });
    const afterPlan = inventoryModel({ stock: i.stock, safetyStockPct: cfg.safetyStockPct, expectedDemand: predictedDemand + plannedUnits, dailyDemand, demandCv: cfg.demandCv });
    const status = classifyStock(now.daysOfCover, cfg);
    return {
      productId: i.productId,
      productName: product.name,
      category: product.category,
      city: i.city,
      stock: i.stock,
      safetyStock: now.safetyStock,
      safeUnits: now.safeUnits,
      predictedDemand,
      dailyDemand,
      daysOfCover: now.daysOfCover,
      status,
      risk: status === "Stockout risk" ? "High" : status === "Low" ? "Medium" : status === "Overstock" ? "Medium" : "Low",
      plannedUnits,
      daysOfCoverAfterPlan: afterPlan.daysOfCoverAfter,
      inventoryValue: i.stock * product.costPrice,
      leadTimeDays: i.leadTimeDays,
    };
  });
}

// ------------------------------------------------------------------ cache
const cache = new Map<string, Plan>();
/** Plans are deterministic, so identical configs share one result. */
export function getPlan(cfg: EngineConfig): Plan {
  const key = JSON.stringify(cfg);
  let plan = cache.get(key);
  if (!plan) {
    plan = buildPlan(cfg);
    if (cache.size >= 8) cache.delete(cache.keys().next().value as string);
    cache.set(key, plan);
  }
  return plan;
}
