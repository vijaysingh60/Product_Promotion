// Talks to the local ML service (ml/server.py). SERVER ONLY.
//
//   Next.js  →  http://127.0.0.1:8000  →  XGBoost uplift model
//
// If the service is not running, predictions fall back to a mock formula so the app
// keeps working; the UI shows which source is in use.

import { DISCOUNT_OPTIONS, fallbackUpliftPct } from "./calculations";
import { comboKey } from "./dataset";
import type { ModelInfo, PredictionSource, PromotionTarget } from "../types";

const ML_API_URL = process.env.ML_API_URL ?? "http://127.0.0.1:8000";
const TIMEOUT_MS = 2000;
const CACHE_MS = 15_000;

/** Predicted sales uplift (%) for a promotion target at a given discount. */
export interface UpliftPredictor {
  source: PredictionSource;
  upliftPct(target: PromotionTarget, discount: number): number;
}

const fallbackPredictor = (): UpliftPredictor => ({
  source: { kind: "fallback" },
  upliftPct: (_target, discount) => fallbackUpliftPct(discount),
});

async function callModel<T>(pathname: string, body?: unknown): Promise<T> {
  const res = await fetch(`${ML_API_URL}${pathname}`, {
    method: body ? "POST" : "GET",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`ML API responded ${res.status}`);
  return res.json() as Promise<T>;
}

function warnFallback(err: unknown) {
  console.warn(`[ml] ${ML_API_URL} unavailable (${err instanceof Error ? err.message : err}) — using mock uplift`);
}

// ------------------------------------------------------- whole catalogue
interface GridResponse {
  model: ModelInfo;
  discounts: number[];
  uplift: Record<string, number[]>;
}
let cached: { at: number; predictor: UpliftPredictor } | null = null;

/** Uplift for every product × segment × location × discount, in one call. Cached briefly. */
export async function getCataloguePredictor(): Promise<UpliftPredictor> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.predictor;

  let predictor: UpliftPredictor;
  try {
    const grid = await callModel<GridResponse>("/predict/all");
    const column = new Map(grid.discounts.map((d, i) => [d, i]));
    predictor = {
      source: { kind: "ml", model: grid.model },
      upliftPct(target, discount) {
        const value = grid.uplift[comboKey(target)]?.[column.get(discount) ?? -1];
        if (value === undefined) throw new Error(`ML API has no prediction for ${comboKey(target)} @ ${discount}%`);
        return value;
      },
    };
  } catch (err) {
    warnFallback(err);
    predictor = fallbackPredictor();
  }
  cached = { at: Date.now(), predictor };
  return predictor;
}

// --------------------------------------------------------- one scenario
interface PredictResponse {
  model: ModelInfo;
  predictions: { discount: number; upliftPct: number }[];
}

/** Fresh predictions for one target at every discount option (used by the simulator). */
export async function getScenarioPredictor(target: PromotionTarget): Promise<UpliftPredictor> {
  try {
    const { model, predictions } = await callModel<PredictResponse>("/predict", {
      items: DISCOUNT_OPTIONS.map((discount) => ({ ...target, discount })),
    });
    const byDiscount = new Map(predictions.map((p) => [p.discount, p.upliftPct]));
    return {
      source: { kind: "ml", model },
      upliftPct(_target, discount) {
        const value = byDiscount.get(discount);
        if (value === undefined) throw new Error(`ML API returned no prediction for ${discount}%`);
        return value;
      },
    };
  } catch (err) {
    warnFallback(err);
    return fallbackPredictor();
  }
}
