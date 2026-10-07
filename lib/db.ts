// MongoDB access. SERVER ONLY — never import this from a client component.
//
// Reads the planning data from the `promopilot` database (override with MONGODB_DB). If the database is
// unreachable, empty or malformed, the app falls back to the bundled demo data and says so on screen.
// The connection string comes from MONGODB_URI in .env and is never logged.

import { MongoClient, type Db } from "mongodb";
import { indexDataset, validateDataset, type IndexedData } from "./dataset";
import { mockDataset } from "./mockData";
import type { DataSource, Dataset, Inventory, Product, Promotion, SeasonEntry, SegmentProfile, SegmentSizes } from "../types";
import { CITY_NAMES, SEGMENT_NAMES } from "../types";

export const DB_NAME = process.env.MONGODB_DB ?? "promopilot";
export const COLLECTIONS = {
  products: "products",
  inventory: "inventory",
  segments: "segments",
  segmentSizes: "segment_sizes",
  promotions: "promotions",
  seasonality: "seasonality",
} as const;

const CACHE_MS = 30_000;
const TIMEOUT_MS = 4_000;

const g = globalThis as unknown as {
  __mongo?: Promise<MongoClient>;
  __dataCache?: { at: number; value: LoadedData };
};

export interface LoadedData {
  data: IndexedData;
  source: DataSource;
}

export const hasMongoConfig = () => Boolean(process.env.MONGODB_URI);

function client(): Promise<MongoClient> {
  if (!g.__mongo) {
    const c = new MongoClient(process.env.MONGODB_URI as string, { serverSelectionTimeoutMS: TIMEOUT_MS, connectTimeoutMS: TIMEOUT_MS });
    g.__mongo = c.connect().catch((err) => {
      g.__mongo = undefined; // retry on the next call
      throw err;
    });
  }
  return g.__mongo;
}

export async function getDb(): Promise<Db> {
  return (await client()).db(DB_NAME);
}

/** Strip Mongo's _id so documents match the app's types. */
const clean = <T,>(docs: Record<string, unknown>[]): T[] => docs.map(({ _id: _ignored, ...rest }) => rest as T);

/** Read every collection into a Dataset. Throws if a collection is empty. */
export async function readDataset(db: Db): Promise<Dataset> {
  const read = async <T,>(name: string) => {
    const docs = await db.collection(name).find({}).toArray();
    if (docs.length === 0) throw new Error(`collection "${name}" is empty`);
    return docs as unknown as Record<string, unknown>[];
  };
  const [products, inventory, segments, sizes, promotions, seasonality] = await Promise.all([
    read(COLLECTIONS.products),
    read(COLLECTIONS.inventory),
    read(COLLECTIONS.segments),
    read(COLLECTIONS.segmentSizes),
    db.collection(COLLECTIONS.promotions).find({}).toArray() as unknown as Promise<Record<string, unknown>[]>, // may legitimately be empty
    read(COLLECTIONS.seasonality),
  ]);

  const segmentSizes = {} as SegmentSizes;
  for (const doc of sizes) {
    const city = doc._id as (typeof CITY_NAMES)[number];
    segmentSizes[city] = doc.sizes as SegmentSizes[typeof city];
  }
  return {
    products: clean<Product>(products),
    inventory: clean<Inventory>(inventory),
    segmentProfiles: clean<SegmentProfile>(segments),
    segmentSizes,
    pastPromotions: clean<Promotion>(promotions),
    seasonality: clean<SeasonEntry>(seasonality).sort((a, b) => a.month - b.month),
  };
}

/** Data for the current request: MongoDB when it works, demo data otherwise. Cached for 30 s (failures too). */
export async function getData(): Promise<LoadedData> {
  const cached = g.__dataCache;
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.value;

  let value: LoadedData;
  if (!hasMongoConfig()) {
    value = { data: indexDataset(mockDataset), source: { kind: "mock", reason: "MONGODB_URI is not set" } };
  } else {
    try {
      const dataset = await readDataset(await getDb());
      const problem = validateDataset(dataset);
      if (problem) throw new Error(`invalid data: ${problem}`);
      value = { data: indexDataset(dataset), source: { kind: "mongodb", database: DB_NAME } };
    } catch (err) {
      const reason = err instanceof Error ? err.message.replace(/\/\/[^@\s]*@/g, "//***@").slice(0, 140) : "unknown error";
      console.warn(`[db] using demo data: ${reason}`);
      value = { data: indexDataset(mockDataset), source: { kind: "mock", reason } };
    }
  }
  g.__dataCache = { at: Date.now(), value };
  return value;
}

/** Forget cached data (used by tests and the seed script). */
export const clearDataCache = () => {
  g.__dataCache = undefined;
};

export { SEGMENT_NAMES };
