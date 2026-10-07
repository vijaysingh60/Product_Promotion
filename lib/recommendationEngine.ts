// Recommendation engine. SERVER ONLY (reads the dataset and calls the ML service).
//
//   CUSTOMER + PRODUCT + DEMAND + INVENTORY + PROMOTION + PROFIT  →  RECOMMENDED PROMOTION
//
// Flow:
//   ML service (ml/server.py, XGBoost)  →  predicted sales uplift for a discount
//   recommendationEngine()              →  turns that into demand, revenue, profit, score and risk
//   recommendBestDiscount()             →  tries every discount, picks the best balance
//   getAllRecommendations()             →  every product × segment × location
//
// What is ML and what is rules:
//   - ML:    sales uplift (%) for a product × segment × location × discount   (lib/mlClient.ts)
//   - Data:  baseline demand, affinity, regional demand, stock, reorder level (lib/dataset.ts)
//   - Rules: the 0–100 score, the risk level and the choice of discount       (this file)
//
// TODO: baseline demand still comes from the dataset's `dummy_predicted_demand` column.
//       Replace it with a second model (demand forecast from transactions) when real data is available.

import { combos, getCombo, getInventory, getProduct, LOCATIONS, SEGMENTS } from "./dataset";
import {
  campaignRisk,
  clamp,
  DISCOUNT_OPTIONS,
  expectedProfit,
  expectedRevenue,
  formatINR,
  marginAfterDiscount,
  RECOMMEND_SCORE,
  REVIEW_SCORE,
} from "./calculations";
import { getCataloguePredictor, getScenarioPredictor, type UpliftPredictor } from "./mlClient";
import type {
  ComboFeatures,
  DiscountAnalysis,
  Inventory,
  Product,
  Promotion,
  PromotionTarget,
  Recommendation,
  RecommendationRow,
  RecommendationStatus,
  ScoreBreakdown,
  Simulation,
} from "../types";

/** Max points per score component. They add up to 100. */
const MAX_POINTS = { affinity: 25, demand: 25, inventory: 20, margin: 15, history: 15 };

// ---------------------------------------------------------------- ids
const slug = (s: string) => s.toLowerCase().replace(/\s+/g, "-");
export const buildRecommendationId = (t: PromotionTarget) => `${t.productId}_${slug(t.segment)}_${slug(t.location)}`;

export function parseRecommendationId(id: string): PromotionTarget | null {
  const [productId, segSlug, locSlug] = id.split("_");
  const segment = SEGMENTS.find((s) => slug(s) === segSlug);
  const location = LOCATIONS.find((l) => slug(l) === locSlug);
  if (!getProduct(productId) || !segment || !location) return null;
  return { productId, segment, location };
}

// --------------------------------------------------------- 1. scoring
/**
 * promotionScore = customerAffinity + demandScore + inventoryScore + marginScore + historicalPromotionScore
 * Each component is capped at its MAX_POINTS; the sum is normalised to 0–100.
 */
function scorePromotion(args: {
  affinity: number; // 0–1
  regionalDemand: number; // 0–1
  upliftPct: number;
  stockAfterRatio: number; // stock left after the campaign ÷ reorder level
  marginAfterPct: number;
  historyUpliftPct: number;
}): { breakdown: ScoreBreakdown; score: number } {
  const customerAffinity = args.affinity * MAX_POINTS.affinity;
  const demandScore =
    (0.6 * clamp((args.regionalDemand - 0.2) / 0.8) + 0.4 * clamp(args.upliftPct / 80)) * MAX_POINTS.demand;
  const inventoryScore = clamp(args.stockAfterRatio) * MAX_POINTS.inventory;
  const marginScore = clamp((args.marginAfterPct - 3) / 30) * MAX_POINTS.margin;
  const historicalPromotionScore = clamp(args.historyUpliftPct / 45) * MAX_POINTS.history;

  const raw = customerAffinity + demandScore + inventoryScore + marginScore + historicalPromotionScore;
  const maxRaw = Object.values(MAX_POINTS).reduce((a, b) => a + b, 0);
  return {
    score: Math.round((raw / maxRaw) * 100),
    breakdown: {
      affinity: round1(customerAffinity),
      demand: round1(demandScore),
      inventory: round1(inventoryScore),
      margin: round1(marginScore),
      history: round1(historicalPromotionScore),
    },
  };
}
const round1 = (n: number) => Math.round(n * 10) / 10;

function statusFor(score: number, risk: Recommendation["risk"]): RecommendationStatus {
  if (score < REVIEW_SCORE) return "Not Recommended";
  if (score >= RECOMMEND_SCORE && risk !== "High") return "Recommended";
  return "Review";
}

// ------------------------------------------------- 2. recommendation
/** Evaluate ONE promotion (product + segment + location + discount). */
export function recommendationEngine(promotion: Promotion, predictor: UpliftPredictor): Recommendation {
  const product = getProduct(promotion.productId);
  const inv = getInventory(promotion.productId, promotion.location);
  const combo = getCombo(promotion);
  if (!product || !inv || !combo) {
    throw new Error(`Unknown promotion: ${promotion.productId} / ${promotion.segment} / ${promotion.location}`);
  }
  const { segment, location, discount } = promotion;

  // ── ML model output: how much this discount lifts sales for this target ──
  const upliftPct = predictor.upliftPct(promotion, discount);
  const demand = Math.round(combo.baselineDemand * (1 + upliftPct / 100));

  const marginAfterPct = marginAfterDiscount(product.margin, discount);
  const stockUsage = demand / inv.stock;
  const stockAfterRatio = (inv.stock - demand) / inv.reorderLevel;

  const { score, breakdown } = scorePromotion({
    affinity: combo.affinity,
    regionalDemand: combo.regionalDemand,
    upliftPct,
    stockAfterRatio,
    marginAfterPct,
    historyUpliftPct: combo.historyUpliftPct,
  });
  const risk = campaignRisk({ stockAfterRatio, marginAfterPct, discount });
  const { reasons, risks } = explain({ breakdown, product, inv, combo, discount, demand, stockAfterRatio, marginAfterPct });

  return {
    id: buildRecommendationId(promotion),
    productId: product.id,
    productName: product.name,
    category: product.category,
    segment,
    location,
    price: product.price,
    discount,
    inventory: inv.stock,
    reorderLevel: inv.reorderLevel,
    score,
    risk,
    status: statusFor(score, risk),
    baselineDemand: combo.baselineDemand,
    upliftPct: round1(upliftPct),
    predictedDemand: demand,
    expectedRevenue: Math.round(expectedRevenue(product.price, discount, demand)),
    expectedProfit: Math.round(expectedProfit(product.price, product.cost, discount, demand)),
    stockUsage,
    breakdown,
    reasons,
    risks,
  };
}

/** Turn score components into human-readable reasons and risks. */
function explain(a: {
  breakdown: ScoreBreakdown;
  product: Product;
  inv: Inventory;
  combo: ComboFeatures;
  discount: number;
  demand: number;
  stockAfterRatio: number;
  marginAfterPct: number;
}) {
  const { breakdown: b, combo, inv } = a;
  const ratio = {
    affinity: b.affinity / MAX_POINTS.affinity,
    demand: b.demand / MAX_POINTS.demand,
    inventory: b.inventory / MAX_POINTS.inventory,
    margin: b.margin / MAX_POINTS.margin,
    history: b.history / MAX_POINTS.history,
  };
  const stockLeft = inv.stock - a.demand;
  const reasons: string[] = [];
  const risks: string[] = [];

  const affinity100 = Math.round(combo.affinity * 100);
  if (ratio.affinity >= 0.6) reasons.push(`High customer affinity — ${combo.segment} score ${affinity100}/100 for this product`);
  else if (ratio.affinity < 0.4) risks.push(`Low customer affinity — ${combo.segment} score only ${affinity100}/100 for this product`);

  if (ratio.demand >= 0.55) reasons.push(`Strong regional demand in ${combo.location}`);
  else if (ratio.demand < 0.35) risks.push(`Weak regional demand in ${combo.location}`);

  if (stockLeft >= inv.reorderLevel) {
    reasons.push(`Sufficient inventory — ${stockLeft} units left after the campaign, above the reorder level of ${inv.reorderLevel}`);
  } else if (ratio.inventory >= 0.6) {
    reasons.push(`Sufficient inventory — campaign needs ~${Math.round((a.demand / inv.stock) * 100)}% of current stock`);
  }
  if (a.stockAfterRatio < 0.35) {
    risks.push(`Stock-out risk — only ${Math.max(stockLeft, 0)} units left after the campaign (reorder level ${inv.reorderLevel})`);
  } else if (stockLeft < inv.reorderLevel) {
    risks.push(`Inventory could decrease quickly — stock falls to ${stockLeft} units, below the reorder level of ${inv.reorderLevel}`);
  }

  if (ratio.margin >= 0.6) reasons.push(`Good product margin — ${Math.round(a.marginAfterPct)}% margin remains after discount`);
  else if (a.marginAfterPct < 12) risks.push(`Thin margin after discount (${Math.round(a.marginAfterPct)}%)`);

  if (combo.historyCount === 0) {
    risks.push("No past promotions on record for this product, segment and location");
  } else if (ratio.history >= 0.5) {
    const n = combo.historyCount;
    reasons.push(
      `Good previous promotion performance — ${n} past campaign${n > 1 ? "s" : ""}, avg. +${Math.round(combo.historyUpliftPct)}% sales uplift`,
    );
  } else if (ratio.history < 0.3) {
    risks.push(`Weak previous promotion performance (avg. ${Math.round(combo.historyUpliftPct)}% sales uplift)`);
  }

  if (a.discount >= 20) risks.push("Deep discount may train customers to wait for sales");
  if (risks.length < 2) risks.push("Demand may increase unexpectedly");

  // Always give the reader something to read, even for weak promotions.
  if (reasons.length === 0) {
    const best = (Object.keys(ratio) as (keyof typeof ratio)[]).sort((x, y) => ratio[y] - ratio[x])[0];
    reasons.push(`Strongest factor is ${LABELS[best]}, but overall fit is limited`);
  }
  return { reasons, risks };
}
const LABELS = {
  affinity: "customer affinity",
  demand: "regional demand",
  inventory: "inventory cover",
  margin: "product margin",
  history: "promotion history",
};

// -------------------------------------------------- 3. discount search
/** Try every discount and pick the one with the best demand / revenue / profit / risk balance. */
export function recommendBestDiscount(target: PromotionTarget, predictor: UpliftPredictor): DiscountAnalysis {
  const options = DISCOUNT_OPTIONS.map((discount) => recommendationEngine({ ...target, discount }, predictor));
  const maxProfit = Math.max(...options.map((o) => o.expectedProfit), 1);
  const maxRevenue = Math.max(...options.map((o) => o.expectedRevenue), 1);
  const maxDemand = Math.max(...options.map((o) => o.predictedDemand), 1);
  const riskPenalty = { Low: 0, Medium: 0.1, High: 0.5 };

  const utility = (o: Recommendation) =>
    0.4 * (o.score / 100) +
    0.25 * (Math.max(o.expectedProfit, 0) / maxProfit) +
    0.2 * (o.expectedRevenue / maxRevenue) +
    0.15 * (o.predictedDemand / maxDemand) -
    riskPenalty[o.risk];

  const best = options.reduce((a, b) => (utility(b) > utility(a) ? b : a));
  return { best, options, explanation: explainChoice(best, options) };
}

function explainChoice(best: Recommendation, options: Recommendation[]): string {
  const higher = options.find((o) => o.discount === best.discount + 5);
  const lower = options.find((o) => o.discount === best.discount - 5);
  const parts: string[] = [];
  if (higher) {
    const dProfit = higher.expectedProfit - best.expectedProfit;
    parts.push(
      `Going up to ${higher.discount}% adds ${higher.predictedDemand - best.predictedDemand} units of demand but ` +
        (dProfit < 0 ? `cuts profit by ${formatINR(-dProfit)}` : `adds only ${formatINR(dProfit)} profit`) +
        (higher.risk !== best.risk ? ` and raises risk to ${higher.risk}.` : "."),
    );
  }
  if (lower) {
    parts.push(
      `Dropping to ${lower.discount}% would lose ${best.predictedDemand - lower.predictedDemand} units of demand.`,
    );
  }
  return (
    `${best.discount}% gives the best balance between demand, revenue, profit and inventory risk. ` + parts.join(" ")
  ).trim();
}

// -------------------------------------------------- 4. full catalogue
/** Keep only the fields the tables show before sending rows to the browser. */
export function toRow(r: Recommendation): RecommendationRow {
  return {
    id: r.id, productId: r.productId, productName: r.productName, segment: r.segment, location: r.location,
    price: r.price, discount: r.discount, inventory: r.inventory, predictedDemand: r.predictedDemand,
    score: r.score, risk: r.risk, status: r.status, expectedRevenue: r.expectedRevenue, expectedProfit: r.expectedProfit,
  };
}

let cache: { predictor: UpliftPredictor; rows: Recommendation[] } | null = null;

/** One best-discount recommendation per product × segment × location, sorted by score. */
export async function getAllRecommendations(): Promise<{ rows: Recommendation[]; source: Simulation["source"] }> {
  const predictor = await getCataloguePredictor();
  // Recompute only when the predictions were refreshed (see CACHE_MS in mlClient.ts).
  if (cache?.predictor !== predictor) {
    const rows = combos.map((target) => recommendBestDiscount(target, predictor).best);
    cache = { predictor, rows: rows.sort((a, b) => b.score - a.score) };
  }
  return { rows: cache.rows, source: predictor.source };
}

export async function getRecommendationById(id: string) {
  if (!parseRecommendationId(id)) return null;
  const { rows, source } = await getAllRecommendations();
  const rec = rows.find((r) => r.id === id);
  return rec ? { rec, source } : null;
}

// ----------------------------------------------------- 5. simulator
/** Fresh model call for one target, evaluated at every discount. */
export async function simulate(target: PromotionTarget): Promise<Simulation> {
  const predictor = await getScenarioPredictor(target);
  return { analysis: recommendBestDiscount(target, predictor), source: predictor.source };
}
