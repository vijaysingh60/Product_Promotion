// Thin server-side entry point for pages: one cached plan per config.
import { getPlan } from "./decisionEngine";
import type { EngineConfig, Plan } from "../types";

export const buildPlanFor = (config: EngineConfig): Plan => getPlan(config);
