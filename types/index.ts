// Shared domain types. Plain data in, plain data out — nothing here depends on React or on the data files.

export const SEGMENT_NAMES = ["Students", "Professionals", "Families", "Premium Customers"] as const;
export const CITY_NAMES = ["Hyderabad", "Bangalore", "Mumbai", "Delhi", "Chennai"] as const;
export const CATEGORY_NAMES = [
  "Audio", "Wearables", "Computers", "Mobiles", "Footwear", "Bags",
  "Home Entertainment", "Kitchen", "Home Appliances", "Accessories", "Beauty", "Sports",
] as const;

export type Segment = (typeof SEGMENT_NAMES)[number];
export type City = (typeof CITY_NAMES)[number];
export type Category = (typeof CATEGORY_NAMES)[number];

export type RiskLevel = "Low" | "Medium" | "High";

// ------------------------------------------------------------------ data
export interface Product {
  id: string;
  name: string;
  category: Category;
  /** Cost price (CP), INR per unit */
  costPrice: number;
  /** Maximum retail price (MRP), INR per unit — also the no-promotion selling price */
  mrp: number;
  /** Gross margin at MRP, percent: (MRP − CP) / MRP */
  margin: number;
  /** Share of sold units that come back (0–1) */
  returnRate: number;
}

/** Stock of one product in one city. Stock is never shared between cities. */
export interface Inventory {
  productId: string;
  city: City;
  stock: number;
  leadTimeDays: number;
  /** Units sold per day today, all segments together, no promotion running */
  dailySalesRate: number;
}

export interface SegmentProfile {
  segment: Segment;
  /** 0–1: how strongly demand reacts to a price cut */
  priceSensitivity: number;
  /** Marketing messages the segment received in the last 30 days */
  recentContacts: number;
  /** 0–1 per category: long-run preference */
  affinity: Record<Category, number>;
  /** 0–1 per category: recent browsing / cart activity */
  intent: Record<Category, number>;
}

/** Reachable customers per city and segment. Segment-level only — no individual customers. */
export type SegmentSizes = Record<City, Record<Segment, number>>;

/** A campaign that already ran. */
export interface Promotion {
  productId: string;
  segment: Segment;
  city: City;
  discountPct: number;
  /** Sales uplift achieved versus baseline, percent */
  upliftPct: number;
  /** ISO date */
  date: string;
}

export interface SeasonEntry {
  month: number; // 1–12
  label: string;
  /** Demand multiplier for every product */
  multiplier: number;
  /** Extra demand for specific categories, e.g. 0.2 = +20% */
  categoryBoost: Partial<Record<Category, number>>;
}

// ----------------------------------------------------------------- config
/** One place for every tunable business rule. */
export interface EngineConfig {
  /** Offer price must stay at or above CP × (1 + this/100) */
  marginFloorPct: number;
  /** Share of stock held back as safety stock, percent */
  safetyStockPct: number;
  /** Cost of one marketing contact, INR */
  costPerContact: number;
  /** Total marketing budget for the plan, INR */
  marketingBudget: number;
  /** Discount grid step, percentage points */
  discountStep: number;
  /** Expected buyers may use at most this share of safe units, percent */
  stockCapPct: number;
  /** Planning window, days */
  horizonDays: number;
  /** Month the plan runs in (1–12), drives seasonality */
  planningMonth: number;
  /** Demand uncertainty (std. deviation ÷ mean) used for stockout probability */
  demandCv: number;
  /** Weight of stockout probability when ranking discounts (0 = ignore) */
  stockoutPenalty: number;
  /** Audiences smaller than this are not worth a campaign */
  minAudience: number;
  /** Days of cover below which a position is "Stockout risk" */
  stockoutRiskCoverDays: number;
  /** Days of cover below which a position is "Low" */
  lowCoverDays: number;
  /** Days of cover above which a position is "Overstock" (clearance candidate) */
  overstockCoverDays: number;
  /** Monthly cost of holding stock, percent of CP (used to value clearance) */
  holdingCostPctPerMonth: number;
}

// ------------------------------------------------------------- model I/O
export type StockStatus = "Healthy" | "Low" | "Stockout risk" | "Overstock";

// ---------------------------------------------------------------- engine
export type Verdict = "PROMOTE" | "DON'T PROMOTE" | "PROMOTE ALTERNATIVE";
export type PromotionKind = "standard" | "clearance";
export type RejectionCode = "NO_PROFITABLE_DISCOUNT" | "PROTECT_STOCK" | "BOUGHT_ANYWAY" | "COST_EXCEEDS_PROFIT";
export type UnfundedCode = "BUDGET_EXHAUSTED" | "STOCK_COMMITTED" | "SEGMENT_FATIGUE";
export type FundingStatus = "funded" | "unfunded" | "rejected";

/** What earlier decisions in the plan have already used up (stock, segment attention, budget). */
export interface EvalState {
  /** Extra units already committed by funded promotions on this product in this city */
  committedUnits: number;
  /** Campaigns already planned for this segment in this city (adds fatigue) */
  extraContacts: number;
  /** Largest audience the remaining budget can pay for */
  maxAudience?: number;
}

export interface PriceBand {
  costPrice: number;
  mrp: number;
  /** Lowest legal offer price: CP × (1 + floor) */
  minOfferPrice: number;
  /** Highest legal offer price: MRP */
  maxOfferPrice: number;
  /** Deepest legal discount, percent (can be ≤ 0 when margin is too thin) */
  maxDiscountPct: number;
  /** True when no discount on the grid is legal */
  isEmpty: boolean;
  /** Legal discounts on the grid, ascending */
  discounts: number[];
}

export interface ProfitBridge {
  /** Profit from the extra units the discount sells */
  volume: number;
  /** Margin given away on customers who would have bought anyway (≤ 0) */
  giveaway: number;
  /** Profit lost to units that cannot be served (≤ 0) */
  stockLoss: number;
  /** Marketing contact cost (≤ 0) */
  promoCost: number;
  /** Value of clearing excess stock (clearance only, ≥ 0) */
  clearance: number;
}

/** One candidate discount, fully evaluated. */
export interface DiscountOption {
  discountPct: number;
  offerPrice: number;
  /** Inside the CP-floor … MRP band */
  legal: boolean;
  /** Audience can run (≥ min audience) */
  viable: boolean;
  marginAtOfferPct: number;

  /** Share of the segment contacted (0–1) */
  coverage: number;
  audience: number;
  segmentSize: number;
  limits: { stockCapped: boolean; committedReduced: boolean; budgetCapped: boolean };

  responseProbability: number;
  fatiguePenalty: number;
  liftPct: number;

  baselineUnits: number;
  /** Segment demand with the promotion, before the stock limit */
  promotedUnits: number;
  /** Extra units versus baseline, before the stock limit */
  incrementalUnits: number;
  unitsServable: number;
  unitsLost: number;

  baselineRevenue: number;
  baselineProfit: number;
  promotedRevenue: number;
  promotedProfit: number;
  incrementalRevenue: number;
  incrementalProfitBeforeCost: number;
  promoCost: number;
  clearanceValue: number;
  /** Incremental profit after promo cost (and clearance value for clearance promotions) */
  incrementalProfit: number;
  /** Incremental profit before cost ÷ promo cost */
  roi: number;
  bridge: ProfitBridge;

  stockoutProbability: number;
  remainingStock: number;
  daysOfCoverAfter: number;
  risk: RiskLevel;
  /** Risk-adjusted incremental profit — what the engine maximises */
  objective: number;
}

export interface Factors {
  /** 0–100 each */
  response: number;
  demand: number;
  stockHealth: number;
  margin: number;
  /** Fatigue penalty shown as 0–100 (higher = more fatigued) */
  fatigue: number;
}

export interface AlternativePick {
  productId: string;
  productName: string;
  discountPct: number;
  incrementalProfit: number;
  /** The alternative was itself left out of the plan (budget or stock) */
  funded: boolean;
}

export interface Recommendation {
  id: string;
  productId: string;
  productName: string;
  category: Category;
  segment: Segment;
  city: City;
  kind: PromotionKind;
  verdict: Verdict;
  status: FundingStatus;
  rejection: { code: RejectionCode; headline: string; detail: string } | null;
  unfunded: { code: UnfundedCode; headline: string } | null;
  band: PriceBand;
  /** The plan state this decision was made under (needed to redraw its profit curve faithfully) */
  evalState: EvalState;
  /** The option the engine picked (null when no legal, viable option exists) */
  chosen: DiscountOption | null;
  /** Every legal, viable option on the grid */
  options: DiscountOption[];
  alternative: AlternativePick | null;
  // position
  stock: number;
  safetyStock: number;
  safeUnits: number;
  daysOfCover: number;
  stockStatus: StockStatus;
  // baseline for this segment, no promotion
  baselineUnits: number;
  baselineProfit: number;
  baselineRevenue: number;
  /** Segment size in this city */
  segmentSize: number;
  // explanation
  factors: Factors;
  reasons: string[];
  risks: string[];
  notes: string[];
  explanation: string;
  risk: RiskLevel;
}

/** Flat row for tables and charts (safe to send to the browser). */
export interface PlanRow {
  id: string;
  productId: string;
  productName: string;
  category: Category;
  segment: Segment;
  city: City;
  kind: PromotionKind;
  verdict: Verdict;
  status: FundingStatus;
  discountPct: number | null;
  audience: number;
  segmentSize: number;
  predictedDemand: number;
  unitsServable: number;
  unitsLost: number;
  baselineUnits: number;
  baselineProfit: number;
  incrementalProfit: number;
  incrementalRevenue: number;
  promoCost: number;
  roi: number;
  bridge: ProfitBridge;
  risk: RiskLevel;
  stock: number;
  safeUnits: number;
  reason: string | null;
  reasonCode: RejectionCode | UnfundedCode | null;
  detail: string | null;
  notes: string[];
  alternative: AlternativePick | null;
}

export interface InventoryRow {
  productId: string;
  productName: string;
  category: Category;
  city: City;
  stock: number;
  safetyStock: number;
  safeUnits: number;
  /** Baseline demand over the planning window */
  predictedDemand: number;
  dailyDemand: number;
  daysOfCover: number;
  status: StockStatus;
  risk: RiskLevel;
  /** Units the funded plan commits in this position */
  plannedUnits: number;
  daysOfCoverAfterPlan: number;
  inventoryValue: number;
  leadTimeDays: number;
}

export interface Plan {
  config: EngineConfig;
  candidates: Recommendation[];
  rows: PlanRow[];
  inventoryRows: InventoryRow[];
  budget: { total: number; used: number };
}

// ------------------------------------------------------------------ data
/** Everything the engine reads. Comes from MongoDB, or from the bundled demo data as a fallback. */
export interface Dataset {
  products: Product[];
  inventory: Inventory[];
  segmentProfiles: SegmentProfile[];
  segmentSizes: SegmentSizes;
  pastPromotions: Promotion[];
  seasonality: SeasonEntry[];
}

/** Where the data on screen came from. */
export type DataSource = { kind: "mongodb"; database: string } | { kind: "mock"; reason: string };
