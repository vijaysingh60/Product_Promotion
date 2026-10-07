// Rule-based chatbot: understands a few kinds of questions and answers from the live plan.
// No model, no API key — every number comes from the same plan the dashboard shows.

import { formatINR, formatNumber } from "./format";
import type { IndexedData } from "./dataset";
import { CATEGORY_NAMES, CITY_NAMES, SEGMENT_NAMES, type Category, type City, type Plan, type Recommendation, type Segment } from "../types";

export interface ChatReply {
  answer: string;
  links: { label: string; href: string }[];
}

/** Words people use → category. */
const CATEGORY_ALIASES: [RegExp, Category][] = [
  [/\b(shoe|shoes|footwear|sneaker|sneakers)\b/, "Footwear"],
  [/\b(audio|headphone|headphones|speaker|speakers)\b/, "Audio"],
  [/\b(watch|watches|wearable|wearables|band)\b/, "Wearables"],
  [/\b(laptop|laptops|tablet|tablets|computer|computers)\b/, "Computers"],
  [/\b(phone|phones|smartphone|smartphones|mobile|mobiles)\b/, "Mobiles"],
  [/\b(bag|bags|backpack|backpacks)\b/, "Bags"],
  [/\b(tv|television|soundbar|home entertainment)\b/, "Home Entertainment"],
  [/\b(kitchen|coffee|fryer|air fryer)\b/, "Kitchen"],
  [/\b(appliance|appliances|microwave|vacuum)\b/, "Home Appliances"],
  [/\b(accessory|accessories|keyboard|power bank|powerbank)\b/, "Accessories"],
  [/\b(beauty|skincare)\b/, "Beauty"],
  [/\b(sport|sports|yoga)\b/, "Sports"],
];

export const SUGGESTIONS = [
  "Will a shoes campaign work in Hyderabad?",
  "Which promotions should we run first?",
  "Why was Television rejected?",
  "Which products are low on stock?",
  "Which products need clearance?",
  "How much of the budget is used?",
];

const has = (text: string, ...words: string[]) => words.some((w) => text.includes(w));
const pct = (n: number) => `${n % 1 === 0 ? n : n.toFixed(1)}%`;

function describe(r: Recommendation): string {
  const o = r.chosen!;
  return `${r.productName} → ${r.segment} in ${r.city} at ${pct(o.discountPct)} off: about ${formatINR(o.incrementalProfit)} extra profit (${formatNumber(o.audience)} customers, ${o.risk.toLowerCase()} risk)`;
}

export function answerQuestion(message: string, plan: Plan, data: IndexedData): ChatReply {
  const q = message.toLowerCase().trim();
  const all = plan.candidates;
  const link = (r: Recommendation) => ({ label: `${r.productName} · ${r.segment} · ${r.city}`, href: `/recommendations/${r.id}` });

  // ---- what is the question about?
  const city = CITY_NAMES.find((c) => q.includes(c.toLowerCase())) as City | undefined;
  const segment = SEGMENT_NAMES.find((s) => q.includes(s.toLowerCase().replace(" customers", "")) || q.includes(s.toLowerCase())) as Segment | undefined;
  const product = data.data.products.find((p) => q.includes(p.name.toLowerCase()) || (p.name.toLowerCase() === "television" && /\btv\b/.test(q)));
  const category = product ? undefined : CATEGORY_ALIASES.find(([re]) => re.test(q))?.[1];
  const subject = product ? product.name : category ? category.toLowerCase() : null;

  // ---- budget
  if (has(q, "budget") && !subject) {
    const { used, total } = plan.budget;
    const left = total - used;
    const waiting = all.filter((r) => r.status === "unfunded").length;
    return {
      answer: `We have used ${formatINR(used)} of the ${formatINR(total)} marketing budget (${formatINR(left)} left). ${waiting} more promotions would pay off but are not funded because the budget ran out. You can change the budget in the Assumptions panel at the bottom of the Dashboard.`,
      links: [{ label: "Open dashboard", href: "/dashboard" }],
    };
  }

  // ---- stock questions
  if (has(q, "stock", "inventory", "stockout", "overstock", "clearance", "running out") && !(subject && has(q, "campaign", "promotion", "promote", "work"))) {
    const wantsClear = has(q, "clearance", "overstock");
    let rows = plan.inventoryRows.filter((i) => (!city || i.city === city) && (!product || i.productId === product.id) && (!category || i.category === category));
    rows = rows.filter((i) => (wantsClear ? i.status === "Overstock" : i.status === "Stockout risk" || i.status === "Low"));
    rows.sort((a, b) => a.daysOfCover - b.daysOfCover);
    if (wantsClear) rows.reverse();
    const where = `${subject ? ` for ${subject}` : ""}${city ? ` in ${city}` : ""}`;
    if (rows.length === 0) return { answer: `Nothing is ${wantsClear ? "overstocked" : "low on stock"}${where}.`, links: [] };
    const lines = rows.slice(0, 5).map((i) => `• ${i.productName} in ${i.city}: ${formatNumber(i.stock)} units, ${i.daysOfCover.toFixed(0)} days of cover (${i.status})`);
    return {
      answer: `${wantsClear ? "Overstocked (clearance candidates)" : "Low or at risk of stockout"}${where}, ${rows.length} position${rows.length > 1 ? "s" : ""}:\n${lines.join("\n")}${rows.length > 5 ? `\n…and ${rows.length - 5} more on the Inventory page.` : ""}`,
      links: [{ label: "Open inventory", href: "/inventory" }],
    };
  }

  // ---- "why was X rejected / not recommended"
  if (subject && has(q, "why", "reject", "not recommended", "don't promote", "dont promote")) {
    const rows = all.filter((r) => (!product || r.productId === product.id) && (!category || r.category === category) && (!city || r.city === city) && (!segment || r.segment === segment));
    const rejected = rows.filter((r) => r.status === "rejected");
    if (rejected.length === 0) return { answer: `None of the ${subject} promotions are rejected${city ? ` in ${city}` : ""}.`, links: [] };
    const reasons = new Map<string, { n: number; example: Recommendation }>();
    rejected.forEach((r) => {
      const k = r.rejection?.headline ?? "Other";
      reasons.set(k, { n: (reasons.get(k)?.n ?? 0) + 1, example: reasons.get(k)?.example ?? r });
    });
    const top = [...reasons.entries()].sort((a, b) => b[1].n - a[1].n);
    const lines = top.slice(0, 3).map(([k, v]) => `• ${k} (${v.n} of ${rejected.length}): ${v.example.rejection?.detail ?? ""}`);
    return { answer: `${rejected.length} of ${rows.length} ${subject} promotions are rejected${city ? ` in ${city}` : ""}. Main reasons:\n${lines.join("\n")}`, links: [link(top[0][1].example)] };
  }

  // ---- "will X campaign work (in city)?" — the main question
  if (subject) {
    const rows = all.filter((r) => (!product || r.productId === product.id) && (!category || r.category === category) && (!city || r.city === city) && (!segment || r.segment === segment));
    if (rows.length === 0) return { answer: `I couldn't find any ${subject} promotions${city ? ` in ${city}` : ""}.`, links: [] };
    const funded = rows.filter((r) => r.status === "funded").sort((a, b) => b.chosen!.incrementalProfit - a.chosen!.incrementalProfit);
    const unfunded = rows.filter((r) => r.status === "unfunded");
    const rejected = rows.filter((r) => r.status === "rejected");
    const scope = `${subject} campaign${segment ? ` for ${segment}` : ""}${city ? ` in ${city}` : ""}`;
    const total = funded.reduce((s, r) => s + r.chosen!.incrementalProfit, 0);
    const parts: string[] = [];

    if (funded.length > 0) {
      parts.push(`Yes — a ${scope} looks worth running. ${funded.length} of ${rows.length} combinations are in the plan, adding about ${formatINR(total)} of extra profit.`);
      parts.push("Best options:\n" + funded.slice(0, 3).map((r) => `• ${describe(r)}`).join("\n"));
    } else if (unfunded.length > 0) {
      const best = unfunded.sort((a, b) => b.chosen!.incrementalProfit - a.chosen!.incrementalProfit)[0];
      parts.push(`It would pay off, but it is not in the plan yet: ${unfunded.length} combination${unfunded.length > 1 ? "s are" : " is"} profitable but ${best.unfunded?.headline.toLowerCase().replace("not funded: ", "") ?? "not funded"}. Best one: ${describe(best)}. Raising the budget would let it through.`);
    } else {
      const top = rejected.reduce((m, r) => m.set(r.rejection?.headline ?? "Other", (m.get(r.rejection?.headline ?? "Other") ?? 0) + 1), new Map<string, number>());
      const [reason, n] = [...top.entries()].sort((a, b) => b[1] - a[1])[0];
      parts.push(`No — I would not run a ${scope}. ${rows.length === 1 ? "The only combination is" : `All ${rows.length} combinations are`} rejected${rows.length === 1 ? " because" : ", mostly because"}: ${reason.toLowerCase()}${rows.length === 1 ? "" : ` (${n})`}.`);
      const alt = rejected.find((r) => r.alternative);
      if (alt?.alternative) parts.push(`Better option: promote ${alt.alternative.productName} at ${pct(alt.alternative.discountPct)} off instead (+${formatINR(alt.alternative.incrementalProfit)}).`);
    }
    if (funded.length > 0 && rejected.length > 0) parts.push(`${rejected.length} other ${subject} combination${rejected.length > 1 ? "s were" : " was"} rejected (e.g. ${rejected[0].rejection?.headline.toLowerCase()}).`);

    // stock in the named city
    if (city) {
      const inv = plan.inventoryRows.filter((i) => i.city === city && (!product || i.productId === product.id) && (!category || i.category === category));
      const risky = inv.filter((i) => i.status === "Stockout risk" || i.status === "Low");
      if (risky.length > 0) parts.push(`Stock watch in ${city}: ${risky.slice(0, 3).map((i) => `${i.productName} ${i.daysOfCover.toFixed(0)} days of cover`).join(", ")}.`);
    }
    return { answer: parts.join("\n\n"), links: (funded.length ? funded : unfunded.length ? unfunded : rejected).slice(0, 3).map(link) };
  }

  // ---- top promotions
  if (has(q, "top", "best", "first", "most profit", "which promotion", "what should", "recommend")) {
    const funded = all.filter((r) => r.status === "funded").sort((a, b) => b.chosen!.incrementalProfit - a.chosen!.incrementalProfit);
    const scoped = funded.filter((r) => (!city || r.city === city) && (!segment || r.segment === segment));
    const list = scoped.slice(0, 5);
    if (list.length === 0) return { answer: "No promotions are in the plan for that selection.", links: [] };
    return { answer: `Top promotions${city ? ` in ${city}` : ""}${segment ? ` for ${segment}` : ""}, by extra profit:\n${list.map((r, i) => `${i + 1}. ${describe(r)}`).join("\n")}`, links: list.slice(0, 3).map(link) };
  }

  return {
    answer: "I can answer questions about promotions, stock and the budget. For example: “Will a shoes campaign work in Hyderabad?”, “Why was Television rejected?” or “Which products are low on stock?”",
    links: [],
  };
}

export { CATEGORY_NAMES };
