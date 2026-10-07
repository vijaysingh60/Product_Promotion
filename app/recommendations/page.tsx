import RecommendationsView from "@/components/RecommendationsView";
import { PageHeader } from "@/components/ui";
import { getData } from "@/lib/db";
import { buildPlanFor } from "@/lib/plan";
import { getConfig } from "@/lib/serverConfig";
import { CATEGORY_NAMES, CITY_NAMES, SEGMENT_NAMES } from "@/types";

export default async function RecommendationsPage() {
  const config = await getConfig();
  const { data } = await getData();
  const plan = buildPlanFor(config, data);
  return (
    <div>
      <PageHeader
        title="Recommendations"
        subtitle="Every product × segment × city, judged on incremental profit. The plan is what fits the budget and the stock; the rest is listed with the reason."
      />
      <RecommendationsView rows={plan.rows} cities={[...CITY_NAMES]} segments={[...SEGMENT_NAMES]} categories={[...CATEGORY_NAMES]} />
    </div>
  );
}
