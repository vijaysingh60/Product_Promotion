// Console check for the decision engine — no UI involved.
//   npm run verify
// Prints a summary of the plan, shows the three demo cases, and exits non-zero if any hard rule is broken.

import { DEFAULT_CONFIG } from "../lib/config";
import { buildPlan, evaluateCandidate } from "../lib/decisionEngine";
import { formatINR, formatNumber } from "../lib/format";
import { DEMO_CASES, getProduct, inventory, products } from "../lib/mockData";
import type { Recommendation } from "../types";

const cfg = DEFAULT_CONFIG;
const plan = buildPlan(cfg);
const count = <T,>(items: T[], f: (x: T) => string) => {
  const m: Record<string, number> = {};
  items.forEach((x) => (m[f(x)] = (m[f(x)] ?? 0) + 1));
  return m;
};
const failures: string[] = [];
const check = (ok: boolean, message: string) => {
  if (!ok) failures.push(message);
  console.log(`${ok ? "  PASS" : "  FAIL"}  ${message}`);
};

console.log(`\n=== PLAN (${plan.candidates.length} candidates, budget ${formatINR(cfg.marketingBudget)}) ===`);
console.log("status        ", count(plan.candidates, (r) => r.status));
console.log("verdict       ", count(plan.candidates, (r) => r.verdict));
console.log("kind (funded) ", count(plan.candidates.filter((r) => r.status === "funded"), (r) => r.kind));
console.log("rejection     ", count(plan.candidates.filter((r) => r.rejection), (r) => r.rejection!.code));
console.log("unfunded      ", count(plan.candidates.filter((r) => r.unfunded), (r) => r.unfunded!.code));
console.log("risk (funded) ", count(plan.candidates.filter((r) => r.status === "funded"), (r) => r.risk));
console.log("discounts     ", count(plan.candidates.filter((r) => r.status === "funded"), (r) => String(r.chosen!.discountPct)));
console.log("budget used   ", formatINR(plan.budget.used), "of", formatINR(plan.budget.total));

const funded = plan.candidates.filter((r) => r.status === "funded" && r.chosen);
const baseline = plan.candidates.reduce((s, r) => s + r.baselineProfit, 0);
const incremental = funded.reduce((s, r) => s + r.chosen!.incrementalProfit, 0);
console.log(`baseline profit ${formatINR(baseline)}  incremental ${formatINR(incremental)} (${((incremental / baseline) * 100).toFixed(2)}%)`);
console.log("top ROI       ", funded.sort((a, b) => b.chosen!.roi - a.chosen!.roi).slice(0, 3).map((r) => `${r.productName}/${r.segment}/${r.city} ${r.chosen!.roi.toFixed(1)}x`).join(" | "));

const show = (title: string, r: Recommendation) => {
  const o = r.chosen;
  console.log(`\n--- ${title}: ${r.productName} · ${r.segment} · ${r.city}`);
  console.log(`    verdict ${r.verdict} (${r.status}) kind=${r.kind} stock=${r.stock} safe=${r.safeUnits} cover=${r.daysOfCover.toFixed(0)}d status=${r.stockStatus}`);
  console.log(`    band: max discount ${r.band.maxDiscountPct.toFixed(1)}%  grid [${r.band.discounts.join(", ")}]`);
  if (r.rejection) console.log(`    REJECTED: ${r.rejection.headline} — ${r.rejection.detail}`);
  if (o) {
    console.log(`    chose ${o.discountPct}% offer ${formatINR(o.offerPrice)} audience ${o.audience}/${o.segmentSize} (${(o.coverage * 100).toFixed(0)}%) demand ${formatNumber(o.promotedUnits)} servable ${formatNumber(o.unitsServable)} lost ${o.unitsLost.toFixed(1)}`);
    console.log(`    incremental profit ${formatINR(o.incrementalProfit)} (before cost ${formatINR(o.incrementalProfitBeforeCost)}, cost ${formatINR(o.promoCost)}, clearance ${formatINR(o.clearanceValue)}) ROI ${o.roi.toFixed(2)}x risk ${o.risk} stockout ${(o.stockoutProbability * 100).toFixed(0)}%`);
  }
  if (r.notes.length) console.log(`    notes: ${r.notes.join(" | ")}`);
  console.log(`    ${r.explanation}`);
};

console.log("\n=== DEMO CASES ===");
const byId = new Map(plan.candidates.map((r) => [r.id, r]));
const find = (c: { productId: string; city: string; segment: string }) =>
  plan.candidates.find((r) => r.productId === c.productId && r.city === c.city && r.segment === c.segment)!;

const a = find(DEMO_CASES.a);
const aAll = plan.candidates.filter((r) => r.productId === DEMO_CASES.a.productId && r.city === DEMO_CASES.a.city);
const aHealthy = plan.candidates.filter((r) => r.productId === DEMO_CASES.a.productId && r.city !== DEMO_CASES.a.city && r.segment === DEMO_CASES.a.segment && r.chosen);
show("(a) " + DEMO_CASES.a.label, a);
aAll.forEach((r) => console.log(`      ${r.segment.padEnd(18)} ${r.verdict.padEnd(10)} ${r.status.padEnd(9)} ${r.chosen ? `${r.chosen.discountPct}% aud ${r.chosen.audience}/${r.segmentSize} risk ${r.risk}` : r.rejection?.headline}`));
const b = find(DEMO_CASES.b);
show("(b) " + DEMO_CASES.b.label, b);
const c = find(DEMO_CASES.c);
show("(c) " + DEMO_CASES.c.label, c);

console.log("\n=== CHECKS ===");
const tv = plan.candidates.filter((r) => r.productId === "p12");
check(tv.every((r) => r.verdict !== "PROMOTE" && r.rejection?.code === "NO_PROFITABLE_DISCOUNT"), "(b) every Television row is rejected with 'No profitable discount available'");
check(b.status === "rejected" && b.rejection?.headline === "No profitable discount available", "(b) Television/Families/Hyderabad is REJECTED");
check(a.verdict === "PROMOTE" && a.status === "funded", "(a) Headphones/Students/Hyderabad is promoted and funded");
const aCoverage = a.chosen ? a.chosen.coverage : 1;
const aRef = aHealthy[0]?.chosen;
check(!!a.chosen && aCoverage < 0.6, `(a) small audience (${(aCoverage * 100).toFixed(0)}% of segment)`);
check(!!a.chosen && !!aRef && a.chosen.discountPct <= aRef.discountPct, `(a) discount (${a.chosen?.discountPct}%) not above a well-stocked city (${aRef?.discountPct}%)`);
check(!!a.chosen && (a.chosen.limits.stockCapped || a.risks.length > 0) && a.risks.some((x) => /limited|chance demand|Audience/.test(x)), "(a) carries a stock warning");
check(c.verdict === "PROMOTE" && c.kind === "clearance" && c.status === "funded", "(c) Coffee Maker/Families/Chennai is a funded CLEARANCE promotion");
check(plan.candidates.filter((r) => r.kind === "clearance" && r.status === "funded").length >= 1, "at least one clearance promotion is funded");

const violations: string[] = [];
for (const r of plan.candidates) {
  for (const o of r.options) {
    const p = getProduct(r.productId)!;
    if (o.offerPrice < p.costPrice * (1 + cfg.marginFloorPct / 100) - 1e-6) violations.push(`${r.id} ${o.discountPct}% below CP floor`);
    if (o.offerPrice > p.mrp + 1e-6) violations.push(`${r.id} ${o.discountPct}% above MRP`);
  }
}
check(violations.length === 0, `no option on any grid breaks the CP×1.05 / MRP band (${violations.length} violations)`);

const used = new Map<string, number>();
for (const r of funded) used.set(`${r.productId}|${r.city}`, (used.get(`${r.productId}|${r.city}`) ?? 0) + r.chosen!.incrementalUnits);
let capBreaks = 0;
for (const i of inventory) {
  const row = plan.inventoryRows.find((x) => x.productId === i.productId && x.city === i.city)!;
  const promoted = used.get(`${i.productId}|${i.city}`) ?? 0;
  if (promoted > 0 && row.predictedDemand + promoted > (cfg.stockCapPct / 100) * row.safeUnits + 1e-6) capBreaks++;
}
check(capBreaks === 0, `funded promotions never push expected buyers past ${cfg.stockCapPct}% of safe units in any city (${capBreaks} breaks)`);
check(plan.budget.used <= cfg.marketingBudget + 1e-6, `budget respected (${formatINR(plan.budget.used)} ≤ ${formatINR(cfg.marketingBudget)})`);
check(funded.every((r) => r.chosen!.incrementalProfit >= 0), "every funded promotion has non-negative incremental profit");
check(plan.candidates.filter((r) => r.verdict === "PROMOTE ALTERNATIVE").every((r) => r.alternative && r.rejection), "alternatives exist only on rejected rows");
check(plan.candidates.filter((r) => r.status === "funded").every((r) => !r.alternative), "no funded row carries an alternative");
check(funded.some((r) => r.notes.some((n) => n.startsWith("audience reduced"))), "stock-aware allocator shows 'audience reduced' notes");
const lowCity = (id: string) => plan.inventoryRows.filter((r) => r.productId === id);
check(plan.inventoryRows.some((r) => r.status === "Stockout risk"), "inventory has stockout-risk positions");
check(plan.inventoryRows.some((r) => r.status === "Overstock"), "inventory has overstock positions");
console.log("\n=== CONFIG SENSITIVITY ===");
const variants: [string, Partial<typeof cfg>][] = [
  ["zero budget", { marketingBudget: 0 }],
  ["free contacts", { costPerContact: 0 }],
  ["margin floor 20%", { marginFloorPct: 20 }],
  ["safety stock 40%", { safetyStockPct: 40 }],
  ["Diwali month", { planningMonth: 11 }],
];
for (const [name, patch] of variants) {
  const v = { ...cfg, ...patch };
  const p2 = buildPlan(v);
  const f2 = p2.candidates.filter((r) => r.status === "funded");
  const bad = p2.candidates.flatMap((r) => r.options).filter((o) => o.offerPrice < 0 || !Number.isFinite(o.incrementalProfit) || !Number.isFinite(o.objective));
  const floorBreaks = p2.candidates.filter((r) => r.options.some((o) => o.offerPrice < r.band.costPrice * (1 + v.marginFloorPct / 100) - 1e-6));
  check(bad.length === 0 && floorBreaks.length === 0, `${name}: ${f2.length} funded, ${formatINR(p2.budget.used)} used, no NaN, floor respected`);
  if (name === "zero budget") check(f2.length === 0, "zero budget funds nothing");
  if (name === "margin floor 20%") check(f2.every((r) => r.chosen!.offerPrice >= r.band.costPrice * 1.2 - 1e-6), "floor 20% → every funded offer ≥ CP × 1.2");
}
console.log(`\n${failures.length === 0 ? "ALL CHECKS PASSED" : `${failures.length} CHECK(S) FAILED`}`);
void byId; void lowCity; void products;
process.exit(failures.length === 0 ? 0 : 1);
