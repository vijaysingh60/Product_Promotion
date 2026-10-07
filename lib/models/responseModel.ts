// Deterministic stub — replace with trained model via API later.
//
// Response model: how likely is a segment to respond to a promotion on this product?
//   P(respond) = long-run affinity + recent intent + past-campaign prior − fatigue
//
// Segment-level only. Output is a probability between 0.02 and 0.98.

export interface ResponseInput {
  /** 0–1: long-run preference for the category */
  affinity: number;
  /** 0–1: recent browsing / cart activity in the category */
  intent: number;
  /** Average uplift (%) of past campaigns for this product and segment; null if none */
  historicalUpliftPct: number | null;
  /** Number of past campaigns behind that average */
  historicalCampaigns: number;
  /** Messages the segment received recently (including ones already planned) */
  recentContacts: number;
}

export interface ResponseOutput {
  probability: number;
  /** Probability points removed because the segment is tired of messages */
  fatiguePenalty: number;
  /** 0–1 contribution of past campaigns */
  historyPrior: number;
}

export const WEIGHTS = { affinity: 0.4, intent: 0.3, history: 0.3 } as const;
/** An unremarkable segment responds with about this probability; used to scale demand lift. */
export const REFERENCE_RESPONSE = 0.5;
const NEUTRAL_HISTORY = 0.4;
const FATIGUE_PER_CONTACT = 0.04;
const MAX_FATIGUE = 0.4;

export function responseModel(input: ResponseInput): ResponseOutput {
  // A segment that responded well before scores higher; with few campaigns we lean on the neutral prior.
  const confidence = input.historicalCampaigns / (input.historicalCampaigns + 2);
  const observed = input.historicalUpliftPct === null ? NEUTRAL_HISTORY : Math.min(1, Math.max(0, input.historicalUpliftPct / 60));
  const historyPrior = NEUTRAL_HISTORY * (1 - confidence) + observed * confidence;

  const fatiguePenalty = Math.min(MAX_FATIGUE, FATIGUE_PER_CONTACT * input.recentContacts);
  const raw = WEIGHTS.affinity * input.affinity + WEIGHTS.intent * input.intent + WEIGHTS.history * historyPrior - fatiguePenalty;
  return { probability: Math.min(0.98, Math.max(0.02, raw)), fatiguePenalty, historyPrior };
}
