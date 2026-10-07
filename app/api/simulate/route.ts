import { NextResponse, type NextRequest } from "next/server";
import { getCombo } from "@/lib/dataset";
import { simulate } from "@/lib/recommendationEngine";

// GET /api/simulate?product=P0001&segment=Students&location=Hyderabad
// Browser → this route → ML service (ml/server.py). Returns every discount option plus the best one.
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const target = {
    productId: q.get("product") ?? "",
    segment: q.get("segment") ?? "",
    location: q.get("location") ?? "",
  };
  if (!getCombo(target)) {
    return NextResponse.json({ error: "Unknown product, segment or location" }, { status: 400 });
  }
  return NextResponse.json(await simulate(target));
}
