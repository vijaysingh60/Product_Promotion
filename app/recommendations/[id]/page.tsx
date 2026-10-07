import { notFound } from "next/navigation";
import RecommendationDetails from "@/components/RecommendationDetails";
import { discountCurve } from "@/lib/decisionEngine";
import { buildPlanFor } from "@/lib/plan";
import { parseId } from "@/lib/mockData";
import { getConfig } from "@/lib/serverConfig";

export default async function RecommendationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const key = parseId(id);
  if (!key) notFound();
  const config = await getConfig();
  const rec = buildPlanFor(config).candidates.find((c) => c.id === id);
  if (!rec) notFound();

  // Profit versus discount on the full range, including discounts below the margin floor (flagged illegal).
  const curve = discountCurve(key, config, rec.evalState).map((o) => ({ discount: o.discountPct, incrementalProfit: Math.round(o.incrementalProfit), legal: o.legal }));
  return <RecommendationDetails rec={rec} curve={curve} floorPct={config.marginFloorPct} costPerContact={config.costPerContact} />;
}
