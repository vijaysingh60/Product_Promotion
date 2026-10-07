// Server only: reads the user's tuned settings from a cookie (written by the settings panel).

import { cookies } from "next/headers";
import { CONFIG_COOKIE, parseConfig } from "./config";
import type { EngineConfig } from "../types";

export async function getConfig(): Promise<EngineConfig> {
  const store = await cookies();
  return parseConfig(store.get(CONFIG_COOKIE)?.value);
}
