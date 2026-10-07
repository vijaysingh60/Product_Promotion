import RecommendationsView from "@/components/RecommendationsView";
import { PageHeader } from "@/components/ui";
import { buildPlanFor } from "@/lib/plan";
import { CATEGORIES, CITIES, SEGMENTS } from "@/lib/mockData";
import { getConfig } from "@/lib/serverConfig";

export default async function RecommendationsPage() {
  const config = await getConfig();
  const plan = buildPlanFor(config);
  return (
    <div>
      <PageHeader
        title="Recommendations"
        subtitle="Every product × segment × city, judged on incremental profit. The plan is what fits the budget and the stock; the rest is listed with the reason."
      />
      <RecommendationsView rows={plan.rows} cities={[...CITIES]} segments={[...SEGMENTS]} categories={[...CATEGORIES]} />
    </div>
  );
}
