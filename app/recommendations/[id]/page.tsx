import { notFound } from "next/navigation";
import RecommendationDetails from "@/components/RecommendationDetails";
import { parseId } from "@/lib/dataset";
import { getData } from "@/lib/db";
import { discountCurve } from "@/lib/decisionEngine";
import { buildPlanFor } from "@/lib/plan";
import { getConfig } from "@/lib/serverConfig";

export default async function RecommendationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data } = await getData();
  const key = parseId(id, data);
  if (!key) notFound();
  const config = await getConfig();
  const rec = buildPlanFor(config, data).candidates.find((c) => c.id === id);
  if (!rec) notFound();

  // Profit versus discount on the full range, including discounts below the margin floor (flagged illegal).
  const curve = discountCurve(key, config, data, rec.evalState).map((o) => ({ discount: o.discountPct, incrementalProfit: Math.round(o.incrementalProfit), legal: o.legal }));
  return <RecommendationDetails rec={rec} curve={curve} floorPct={config.marginFloorPct} costPerContact={config.costPerContact} />;
}
