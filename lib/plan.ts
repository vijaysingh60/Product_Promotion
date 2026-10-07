// Thin server-side entry point for pages: one cached plan per config and dataset.
import { getPlan } from "./decisionEngine";
import type { IndexedData } from "./dataset";
import type { EngineConfig, Plan } from "../types";

export const buildPlanFor = (config: EngineConfig, data: IndexedData): Plan => getPlan(config, data);
