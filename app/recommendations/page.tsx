import RecommendationTable from "@/components/RecommendationTable";
import { Card, ModelStatus, PageHeader } from "@/components/ui";
import { LOCATIONS, SEGMENTS } from "@/lib/dataset";
import { getAllRecommendations, toRow } from "@/lib/recommendationEngine";

export const dynamic = "force-dynamic";

export default async function RecommendationsPage() {
  const { rows, source } = await getAllRecommendations();
  return (
    <div>
      <PageHeader
        title="Promotion Recommendations"
        subtitle="Every product × segment × location, each with the discount that best balances demand, revenue, profit and inventory risk."
      >
        <ModelStatus source={source} />
      </PageHeader>
      <Card>
        <RecommendationTable rows={rows.map(toRow)} detailed segments={SEGMENTS} locations={LOCATIONS} />
      </Card>
    </div>
  );
}
