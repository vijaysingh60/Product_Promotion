// Pure helpers over a Dataset: indexed lookups, ids and validation. Safe in the browser and on the server.
// The engine never reads data files or a database itself — it is handed an IndexedData.

import { CATEGORY_NAMES, CITY_NAMES, SEGMENT_NAMES, type Category, type City, type Dataset, type Inventory, type Product, type Segment, type SegmentProfile } from "../types";

export interface IndexedData {
  data: Dataset;
  /** Changes whenever the data changes; used as a cache key for plans */
  version: string;
  product(id: string): Product | undefined;
  inventoryAt(productId: string, city: City): Inventory | undefined;
  profile(segment: Segment): SegmentProfile | undefined;
  /** Average uplift of past campaigns for this product and segment */
  history(productId: string, segment: Segment): { avgUpliftPct: number | null; campaigns: number };
  /** Demand multiplier for a category in a month, plus the label to show */
  season(month: number, category: Category): { label: string; multiplier: number };
}

function hash(text: string): string {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

const cache = new WeakMap<Dataset, IndexedData>();

export function indexDataset(data: Dataset): IndexedData {
  const hit = cache.get(data);
  if (hit) return hit;

  const productById = new Map(data.products.map((p) => [p.id, p]));
  const inventoryByKey = new Map(data.inventory.map((i) => [`${i.productId}|${i.city}`, i]));
  const profileBySegment = new Map(data.segmentProfiles.map((s) => [s.segment, s]));
  const promos = new Map<string, number[]>();
  for (const p of data.pastPromotions) {
    const k = `${p.productId}|${p.segment}`;
    promos.set(k, [...(promos.get(k) ?? []), p.upliftPct]);
  }

  const indexed: IndexedData = {
    data,
    version: hash(JSON.stringify(data)),
    product: (id) => productById.get(id),
    inventoryAt: (productId, city) => inventoryByKey.get(`${productId}|${city}`),
    profile: (segment) => profileBySegment.get(segment),
    history(productId, segment) {
      const rows = promos.get(`${productId}|${segment}`);
      if (!rows || rows.length === 0) return { avgUpliftPct: null, campaigns: 0 };
      return { avgUpliftPct: rows.reduce((a, b) => a + b, 0) / rows.length, campaigns: rows.length };
    },
    season(month, category) {
      const entry = data.seasonality.find((s) => s.month === month) ?? data.seasonality[0];
      return { label: entry.label, multiplier: entry.multiplier * (1 + (entry.categoryBoost[category] ?? 0)) };
    },
  };
  cache.set(data, indexed);
  return indexed;
}

// ------------------------------------------------------ recommendation ids
const slug = (s: string) => s.toLowerCase().replace(/\s+/g, "-");
export const buildId = (productId: string, segment: Segment, city: City) => `${productId}_${slug(segment)}_${slug(city)}`;

export function parseId(id: string, data: IndexedData): { productId: string; segment: Segment; city: City } | null {
  const [productId, segSlug, citySlug] = id.split("_");
  const segment = SEGMENT_NAMES.find((s) => slug(s) === segSlug);
  const city = CITY_NAMES.find((c) => slug(c) === citySlug);
  if (!data.product(productId) || !segment || !city) return null;
  return { productId, segment, city };
}

// ------------------------------------------------------------- validation
/** Returns a message describing the first problem, or null when the dataset can drive the engine. */
export function validateDataset(d: Dataset): string | null {
  if (d.products.length === 0) return "no products";
  const ids = new Set<string>();
  for (const p of d.products) {
    if (ids.has(p.id)) return `duplicate product id ${p.id}`;
    ids.add(p.id);
    if (!(CATEGORY_NAMES as readonly string[]).includes(p.category)) return `product ${p.id} has unknown category "${p.category}"`;
    if (!(p.costPrice > 0) || !(p.mrp > 0)) return `product ${p.id} needs a positive cost price and MRP`;
    if (!(p.returnRate >= 0 && p.returnRate < 1)) return `product ${p.id} has an invalid return rate`;
  }
  const seen = new Set<string>();
  for (const i of d.inventory) {
    if (!ids.has(i.productId)) return `inventory row for unknown product ${i.productId}`;
    if (!(CITY_NAMES as readonly string[]).includes(i.city)) return `inventory row has unknown city "${i.city}"`;
    if (!(i.stock >= 0) || !(i.dailySalesRate > 0)) return `inventory ${i.productId}/${i.city} needs stock ≥ 0 and a positive daily sales rate`;
    seen.add(`${i.productId}|${i.city}`);
  }
  for (const p of d.products) for (const c of CITY_NAMES) if (!seen.has(`${p.id}|${c}`)) return `no inventory row for ${p.id} in ${c}`;
  for (const s of SEGMENT_NAMES) {
    const prof = d.segmentProfiles.find((x) => x.segment === s);
    if (!prof) return `missing segment profile "${s}"`;
    for (const c of CATEGORY_NAMES) if (typeof prof.affinity[c] !== "number" || typeof prof.intent[c] !== "number") return `segment "${s}" is missing affinity or intent for ${c}`;
    for (const city of CITY_NAMES) if (!(d.segmentSizes[city]?.[s] > 0)) return `missing segment size for ${s} in ${city}`;
  }
  for (let m = 1; m <= 12; m++) if (!d.seasonality.some((x) => x.month === m)) return `seasonality is missing month ${m}`;
  for (const pr of d.pastPromotions) if (!ids.has(pr.productId)) return `past promotion for unknown product ${pr.productId}`;
  return null;
}
