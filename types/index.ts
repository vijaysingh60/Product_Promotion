// Shared domain types for the Promotion & Inventory Alignment Planner.

// Values come from the dataset (dmart_synthetic_dataset/), so these stay plain strings.
export type Segment = string;
export type Location = string;
export type Category = string;

export type RiskLevel = "Low" | "Medium" | "High";
export type StockStatus = "Healthy" | "Low Stock" | "Critical";
export type RecommendationStatus = "Recommended" | "Review" | "Not Recommended";

export interface Product {
  id: string;
  name: string;
  category: Category;
  /** List price in INR */
  price: number;
  /** Unit cost in INR */
  cost: number;
  /** Gross margin at list price, in percent (e.g. 40 = 40%) */
  margin: number;
}

export interface Customer {
  id: string;
  age: number;
  gender: string;
  segment: Segment;
  location: Location;
  /** Orders per month */
  purchaseFrequency: number;
  /** Average monthly spend in INR */
  avgMonthlySpend: number;
  preferredCategory: Category;
}

/** Stock position of one product at one location. */
export interface Inventory {
  productId: string;
  location: Location;
  /** Units currently in stock */
  stock: number;
  /** Stock level at which a replenishment order should be placed */
  reorderLevel: number;
  leadTimeDays: number;
  /** Baseline predicted demand (units) summed over all customer segments */
  predictedDemand: number;
}

export interface Promotion {
  productId: string;
  segment: Segment;
  location: Location;
  /** Discount in percent (e.g. 10 = 10%) */
  discount: number;
}
export type PromotionTarget = Omit<Promotion, "discount">;

/** Static features of one product × segment × location (promotion_model_data.csv). */
export interface ComboFeatures extends PromotionTarget {
  /** 0–1: how strongly this segment buys this product */
  affinity: number;
  /** 0–1: demand strength for this product in this location */
  regionalDemand: number;
  /** Average sales uplift (%) of past promotions */
  historyUpliftPct: number;
  /** Number of past promotions behind historyUpliftPct (0 = none on record) */
  historyCount: number;
  /** Units expected without any promotion */
  baselineDemand: number;
}

export interface ScoreBreakdown {
  affinity: number; // 0–25  (CUSTOMER)
  demand: number; // 0–25  (DEMAND)
  inventory: number; // 0–20  (INVENTORY)
  margin: number; // 0–15  (PRODUCT / PROFIT)
  history: number; // 0–15  (PROMOTION)
}

export interface Recommendation {
  id: string;
  productId: string;
  productName: string;
  category: Category;
  segment: Segment;
  location: Location;
  price: number;
  discount: number;
  inventory: number;
  reorderLevel: number;
  score: number; // 0–100
  risk: RiskLevel;
  status: RecommendationStatus;
  /** Units expected without the promotion */
  baselineDemand: number;
  /** Predicted sales uplift (%) from the demand model */
  upliftPct: number;
  predictedDemand: number;
  expectedRevenue: number;
  expectedProfit: number;
  /** Share of current stock the campaign is expected to consume (0–1+) */
  stockUsage: number;
  breakdown: ScoreBreakdown;
  reasons: string[];
  risks: string[];
}

/** Only what the tables show — keeps the page payload small (the catalogue has thousands of rows). */
export type RecommendationRow = Pick<
  Recommendation,
  | "id" | "productId" | "productName" | "segment" | "location" | "price" | "discount" | "inventory"
  | "predictedDemand" | "score" | "risk" | "status" | "expectedRevenue" | "expectedProfit"
>;

export interface DiscountAnalysis {
  best: Recommendation;
  options: Recommendation[];
  explanation: string;
}

export interface ModelInfo {
  name: string;
  /** 5-fold cross-validated R² */
  r2: number;
  /** 5-fold cross-validated mean absolute error, in uplift percentage points */
  mae: number;
  rows: number;
  trainedAt: string;
}

/** Where the uplift numbers on screen came from. */
export type PredictionSource = { kind: "ml"; model: ModelInfo } | { kind: "fallback" };

/** Result of evaluating one target at every discount (what the simulator shows). */
export interface Simulation {
  analysis: DiscountAnalysis;
  source: PredictionSource;
}
