// Write the demo dataset into MongoDB.
//
//   npm run seed            fills collections that are empty, leaves the rest alone
//   npm run seed -- --reset drops and refills this app's collections (only the ones listed in lib/db.ts)
//
// Reads MONGODB_URI (and optionally MONGODB_DB) from .env. Safe to run twice.

import { COLLECTIONS, DB_NAME, getDb } from "../lib/db";
import { validateDataset } from "../lib/dataset";
import { mockDataset } from "../lib/mockData";
import { CITY_NAMES } from "../types";

if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI is not set. Add it to .env first.");
  process.exit(1);
}
const reset = process.argv.includes("--reset");
const problem = validateDataset(mockDataset);
if (problem) {
  console.error(`Demo data is invalid: ${problem}`);
  process.exit(1);
}

const db = await getDb();
console.log(`Database "${DB_NAME}" ${reset ? "(reset mode: refilling this app's collections)" : ""}`);

const d = mockDataset;
const plan: { name: string; docs: Record<string, unknown>[] }[] = [
  { name: COLLECTIONS.products, docs: d.products.map((p) => ({ _id: p.id, ...p })) },
  { name: COLLECTIONS.inventory, docs: d.inventory.map((i) => ({ _id: `${i.productId}|${i.city}`, ...i })) },
  { name: COLLECTIONS.segments, docs: d.segmentProfiles.map((s) => ({ _id: s.segment, ...s })) },
  { name: COLLECTIONS.segmentSizes, docs: CITY_NAMES.map((city) => ({ _id: city, sizes: d.segmentSizes[city] })) },
  { name: COLLECTIONS.promotions, docs: d.pastPromotions.map((p) => ({ ...p })) },
  { name: COLLECTIONS.seasonality, docs: d.seasonality.map((s) => ({ _id: s.month, ...s })) },
];

for (const { name, docs } of plan) {
  const col = db.collection(name);
  const existing = await col.estimatedDocumentCount();
  if (existing > 0 && !reset) {
    console.log(`  skip   ${name.padEnd(14)} already has ${existing} documents (use --reset to replace)`);
    continue;
  }
  if (existing > 0) await col.deleteMany({});
  await col.insertMany(docs as never[]);
  console.log(`  filled ${name.padEnd(14)} ${docs.length} documents`);
}

// Lookups the app relies on.
await db.collection(COLLECTIONS.inventory).createIndex({ productId: 1, city: 1 }, { unique: true });
await db.collection(COLLECTIONS.promotions).createIndex({ productId: 1, segment: 1 });
console.log("Done.");
process.exit(0);
