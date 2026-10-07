import { notFound } from "next/navigation";
import RecommendationDetails from "@/components/RecommendationDetails";
import { getRecommendationById } from "@/lib/recommendationEngine";

export default async function RecommendationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = await getRecommendationById(id);
  if (!found) notFound();
  return <RecommendationDetails rec={found.rec} source={found.source} />;
}
