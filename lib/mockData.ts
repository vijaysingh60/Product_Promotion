// Synthetic demo data for a generic e-commerce / retail business. Deterministic (seeded), so the
// server and the browser always agree. Everything is segment-level: no individual customers.
//
// To use real data, replace the exported constants with your own, keeping the types in types/index.ts.

import { CATEGORY_ELASTICITY } from "./models/demandModel";
import {
  CATEGORY_NAMES,
  CITY_NAMES,
  SEGMENT_NAMES,
  type Category,
  type City,
  type Dataset,
  type Inventory,
  type Product,
  type Promotion,
  type SeasonEntry,
  type Segment,
  type SegmentProfile,
  type SegmentSizes,
} from "../types";

export const SEGMENTS: readonly Segment[] = SEGMENT_NAMES;
export const CITIES: readonly City[] = CITY_NAMES;
export const CATEGORIES: readonly Category[] = CATEGORY_NAMES;

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

// ---------------------------------------------------------------- products
type ProductSeed = Omit<Product, "margin"> & {
  /** Units per day in an average city today */
  baseDailyRate: number;
  /** Typical days of stock cover */
  coverDays: number;
};

// DEMO CASE (b): the Television has a 4% margin — CP × 1.05 is above MRP, so it can never be discounted.
const PRODUCT_SEEDS: ProductSeed[] = [
  { id: "p01", name: "Wireless Headphones", category: "Audio", costPrice: 1650, mrp: 2999, returnRate: 0.06, baseDailyRate: 4.5, coverDays: 75 },
  { id: "p02", name: "Bluetooth Speaker", category: "Audio", costPrice: 2100, mrp: 3499, returnRate: 0.05, baseDailyRate: 3, coverDays: 80 },
  { id: "p03", name: "Smart Watch", category: "Wearables", costPrice: 3900, mrp: 5999, returnRate: 0.07, baseDailyRate: 3.5, coverDays: 75 },
  { id: "p04", name: "Fitness Band", category: "Wearables", costPrice: 1500, mrp: 2499, returnRate: 0.06, baseDailyRate: 4, coverDays: 70 },
  { id: "p05", name: "Laptop", category: "Computers", costPrice: 54800, mrp: 62990, returnRate: 0.03, baseDailyRate: 0.9, coverDays: 70 },
  { id: "p06", name: "Tablet", category: "Computers", costPrice: 21600, mrp: 26999, returnRate: 0.04, baseDailyRate: 1.2, coverDays: 65 },
  { id: "p07", name: "Smartphone", category: "Mobiles", costPrice: 26100, mrp: 29999, returnRate: 0.04, baseDailyRate: 2.5, coverDays: 60 },
  { id: "p08", name: "Power Bank", category: "Accessories", costPrice: 1100, mrp: 1999, returnRate: 0.04, baseDailyRate: 6, coverDays: 80 },
  { id: "p09", name: "Running Shoes", category: "Footwear", costPrice: 2250, mrp: 4499, returnRate: 0.12, baseDailyRate: 3, coverDays: 85 },
  { id: "p10", name: "Sneakers", category: "Footwear", costPrice: 1650, mrp: 3299, returnRate: 0.12, baseDailyRate: 3.5, coverDays: 85 },
  { id: "p11", name: "Backpack", category: "Bags", costPrice: 1050, mrp: 2199, returnRate: 0.05, baseDailyRate: 4, coverDays: 90 },
  { id: "p12", name: "Television", category: "Home Entertainment", costPrice: 33600, mrp: 34999, returnRate: 0.03, baseDailyRate: 0.8, coverDays: 70 },
  { id: "p13", name: "Soundbar", category: "Home Entertainment", costPrice: 8400, mrp: 11999, returnRate: 0.05, baseDailyRate: 1.2, coverDays: 75 },
  { id: "p14", name: "Coffee Maker", category: "Kitchen", costPrice: 3000, mrp: 4999, returnRate: 0.05, baseDailyRate: 1.5, coverDays: 80 },
  { id: "p15", name: "Air Fryer", category: "Kitchen", costPrice: 4800, mrp: 7499, returnRate: 0.05, baseDailyRate: 2.2, coverDays: 70 },
  { id: "p16", name: "Skincare Kit", category: "Beauty", costPrice: 850, mrp: 1799, returnRate: 0.08, baseDailyRate: 5, coverDays: 80 },
  { id: "p17", name: "Microwave Oven", category: "Home Appliances", costPrice: 9500, mrp: 12999, returnRate: 0.03, baseDailyRate: 1, coverDays: 75 },
  { id: "p18", name: "Vacuum Cleaner", category: "Home Appliances", costPrice: 6700, mrp: 9499, returnRate: 0.04, baseDailyRate: 0.9, coverDays: 75 },
  { id: "p19", name: "Yoga Mat", category: "Sports", costPrice: 700, mrp: 1499, returnRate: 0.05, baseDailyRate: 3, coverDays: 90 },
  { id: "p20", name: "Mechanical Keyboard", category: "Accessories", costPrice: 2500, mrp: 4299, returnRate: 0.05, baseDailyRate: 2, coverDays: 80 },
];

export const products: Product[] = PRODUCT_SEEDS.map(({ baseDailyRate: _r, coverDays: _c, ...p }) => ({
  ...p,
  margin: Math.round(((p.mrp - p.costPrice) / p.mrp) * 1000) / 10,
}));

// --------------------------------------------------------------- inventory
const CITY_DEMAND_FACTOR: Record<City, number> = { Hyderabad: 1.0, Bangalore: 1.15, Mumbai: 1.25, Delhi: 1.2, Chennai: 0.85 };

/**
 * Hand-set positions for the three demo cases (key: "productId|city").
 *   (a) HIGH DEMAND + LOW STOCK  — Headphones in Hyderabad sell fast and stock is only ~46 days of cover,
 *       so normal sales already use most of the safe stock: the engine finds a little headroom and
 *       promotes to a small audience at a small discount, with a warning.
 *   (c) OVERSTOCKED SLOW MOVER   — Coffee Maker in Chennai: ~190 days of cover → clearance promotion.
 * A few more positions are made scarce on purpose so the stockout-risk KPI has something to show.
 */
const INVENTORY_OVERRIDES: Record<string, { stock: number; dailySalesRate: number }> = {
  "p01|Hyderabad": { stock: 232, dailySalesRate: 4.5 }, // (a)
  "p14|Chennai": { stock: 340, dailySalesRate: 1.8 }, // (c)
  "p18|Mumbai": { stock: 260, dailySalesRate: 1.1 }, // second clearance example (~236 days)
  "p16|Delhi": { stock: 950, dailySalesRate: 6.4 }, // overstocked beauty line (~150 days)
  "p09|Chennai": { stock: 560, dailySalesRate: 3.0 }, // overstocked footwear (~185 days)
  "p20|Mumbai": { stock: 480, dailySalesRate: 2.3 }, // overstocked keyboards (~210 days)
  "p07|Delhi": { stock: 38, dailySalesRate: 3.3 }, // stockout risk
  "p13|Bangalore": { stock: 24, dailySalesRate: 1.6 }, // stockout risk
  "p08|Mumbai": { stock: 120, dailySalesRate: 8.2 }, // stockout risk
  "p15|Delhi": { stock: 70, dailySalesRate: 3.4 }, // stockout risk
  "p17|Hyderabad": { stock: 40, dailySalesRate: 1.2 }, // low stock
};

function generateInventory(): Inventory[] {
  const rand = mulberry32(11);
  const rows: Inventory[] = [];
  for (const seed of PRODUCT_SEEDS) {
    for (const city of CITIES) {
      const dailySalesRate = Math.round(seed.baseDailyRate * CITY_DEMAND_FACTOR[city] * (0.85 + rand() * 0.3) * 10) / 10;
      const cover = seed.coverDays * (0.85 + rand() * 0.3);
      const leadTimeDays = 3 + Math.floor(rand() * 7);
      const override = INVENTORY_OVERRIDES[`${seed.id}|${city}`];
      rows.push({
        productId: seed.id,
        city,
        stock: override?.stock ?? Math.max(10, Math.round(dailySalesRate * cover)),
        dailySalesRate: override?.dailySalesRate ?? dailySalesRate,
        leadTimeDays,
      });
    }
  }
  return rows;
}
export const inventory: Inventory[] = generateInventory();

// ---------------------------------------------------------------- segments
const AFFINITY: Record<Segment, Record<Category, number>> = {
  Students: {
    Audio: 0.9, Wearables: 0.7, Computers: 0.6, Mobiles: 0.75, Footwear: 0.7, Bags: 0.9,
    "Home Entertainment": 0.3, Kitchen: 0.2, "Home Appliances": 0.15, Accessories: 0.85, Beauty: 0.5, Sports: 0.65,
  },
  Professionals: {
    Audio: 0.65, Wearables: 0.7, Computers: 0.9, Mobiles: 0.8, Footwear: 0.5, Bags: 0.6,
    "Home Entertainment": 0.4, Kitchen: 0.35, "Home Appliances": 0.3, Accessories: 0.7, Beauty: 0.55, Sports: 0.6,
  },
  Families: {
    Audio: 0.35, Wearables: 0.4, Computers: 0.45, Mobiles: 0.55, Footwear: 0.6, Bags: 0.5,
    "Home Entertainment": 0.9, Kitchen: 0.9, "Home Appliances": 0.85, Accessories: 0.3, Beauty: 0.5, Sports: 0.4,
  },
  "Premium Customers": {
    Audio: 0.8, Wearables: 0.85, Computers: 0.85, Mobiles: 0.9, Footwear: 0.7, Bags: 0.6,
    "Home Entertainment": 0.8, Kitchen: 0.7, "Home Appliances": 0.65, Accessories: 0.5, Beauty: 0.8, Sports: 0.7,
  },
};

const SEGMENT_TRAITS: Record<Segment, { priceSensitivity: number; recentContacts: number }> = {
  Students: { priceSensitivity: 0.85, recentContacts: 3 },
  Professionals: { priceSensitivity: 0.5, recentContacts: 2 },
  Families: { priceSensitivity: 0.75, recentContacts: 1 },
  "Premium Customers": { priceSensitivity: 0.25, recentContacts: 4 },
};

function generateSegments(): SegmentProfile[] {
  const rand = mulberry32(23);
  return SEGMENTS.map((segment) => {
    const affinity = AFFINITY[segment];
    // Recent intent follows long-run affinity, with some category-level noise.
    const intent = Object.fromEntries(
      CATEGORIES.map((c) => [c, Math.round(clamp01(affinity[c] + (rand() - 0.5) * 0.4) * 100) / 100]),
    ) as Record<Category, number>;
    return { segment, ...SEGMENT_TRAITS[segment], affinity, intent };
  });
}
export const segmentProfiles: SegmentProfile[] = generateSegments();

/** Reachable customers per city and segment (about a year of active shoppers). */
function generateSegmentSizes(): SegmentSizes {
  const rand = mulberry32(31);
  const base: Record<Segment, number> = { Students: 1800, Professionals: 2400, Families: 2000, "Premium Customers": 800 };
  const sizes = {} as SegmentSizes;
  for (const city of CITIES) {
    sizes[city] = {} as Record<Segment, number>;
    for (const segment of SEGMENTS) {
      sizes[city][segment] = Math.round((base[segment] * CITY_DEMAND_FACTOR[city] * (0.9 + rand() * 0.2)) / 10) * 10;
    }
  }
  return sizes;
}
export const segmentSizes: SegmentSizes = generateSegmentSizes();

// ------------------------------------------------------------- seasonality
export const seasonality: SeasonEntry[] = [
  { month: 1, label: "Republic Day sales", multiplier: 1.05, categoryBoost: { Computers: 0.1, Mobiles: 0.1 } },
  { month: 2, label: "Post-sale lull", multiplier: 0.95, categoryBoost: {} },
  { month: 3, label: "Holi & year-end", multiplier: 0.95, categoryBoost: { Footwear: 0.05 } },
  { month: 4, label: "Summer begins", multiplier: 0.95, categoryBoost: { "Home Appliances": 0.1 } },
  { month: 5, label: "Summer peak", multiplier: 0.95, categoryBoost: { "Home Appliances": 0.15, Sports: 0.1 } },
  { month: 6, label: "Monsoon", multiplier: 0.9, categoryBoost: { Bags: 0.1 } },
  { month: 7, label: "Mid-year sale", multiplier: 1.1, categoryBoost: { Mobiles: 0.1, Computers: 0.1 } },
  { month: 8, label: "Independence Day sale", multiplier: 1.05, categoryBoost: { Audio: 0.1, Wearables: 0.1 } },
  { month: 9, label: "Pre-festive", multiplier: 1.0, categoryBoost: { "Home Entertainment": 0.1 } },
  {
    month: 10, label: "Festive run-up (Navratri / Diwali)", multiplier: 1.12,
    categoryBoost: { "Home Appliances": 0.25, "Home Entertainment": 0.2, Kitchen: 0.2, Mobiles: 0.15, Wearables: 0.1, Footwear: 0.1, Beauty: 0.15 },
  },
  {
    month: 11, label: "Diwali", multiplier: 1.3,
    categoryBoost: { "Home Appliances": 0.3, "Home Entertainment": 0.3, Kitchen: 0.25, Mobiles: 0.2, Beauty: 0.2, Wearables: 0.15 },
  },
  { month: 12, label: "Year-end & winter", multiplier: 1.1, categoryBoost: { Footwear: 0.1, Sports: 0.1 } },
];

// -------------------------------------------------------- past promotions
function generatePastPromotions(): Promotion[] {
  const rand = mulberry32(7);
  const rows: Promotion[] = [];
  for (const product of products) {
    for (let i = 0; i < 3; i++) {
      const segment = SEGMENTS[Math.floor(rand() * SEGMENTS.length)];
      const city = CITIES[Math.floor(rand() * CITIES.length)];
      const discountPct = [5, 10, 10, 15, 20][Math.floor(rand() * 5)];
      const d = discountPct / 100;
      const profile = SEGMENT_TRAITS[segment];
      const fit = 0.6 + AFFINITY[segment][product.category] * 0.8;
      const ideal = ((CATEGORY_ELASTICITY[product.category] * profile.priceSensitivity * d) / (1 + 2 * d)) * 100 * fit;
      const month = 1 + Math.floor(rand() * 12);
      rows.push({
        productId: product.id,
        segment,
        city,
        discountPct,
        upliftPct: Math.round(ideal * (0.6 + rand() * 0.8)),
        date: `2025-${String(month).padStart(2, "0")}-${String(1 + Math.floor(rand() * 27)).padStart(2, "0")}`,
      });
    }
  }
  return rows;
}
export const pastPromotions: Promotion[] = generatePastPromotions();

/** The bundled demo data, in the same shape the database returns. Used for seeding and as a fallback. */
export const mockDataset: Dataset = { products, inventory, segmentProfiles, segmentSizes, pastPromotions, seasonality };

/** The three demo cases the engine must handle (checked by scripts/verify.mts). */
export const DEMO_CASES = {
  a: { label: "High demand + low stock", productId: "p01", city: "Hyderabad" as City, segment: "Students" as Segment },
  b: { label: "Thin margin product", productId: "p12", city: "Hyderabad" as City, segment: "Families" as Segment },
  c: { label: "Overstocked slow mover", productId: "p14", city: "Chennai" as City, segment: "Families" as Segment },
};
