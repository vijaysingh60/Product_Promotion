import DashboardView from "@/components/DashboardView";
import { PageHeader } from "@/components/ui";
import { buildPlanFor } from "@/lib/plan";
import { CATEGORIES, CITIES, SEGMENTS, seasonFor } from "@/lib/mockData";
import { getConfig } from "@/lib/serverConfig";

export default async function DashboardPage() {
  const config = await getConfig();
  const plan = buildPlanFor(config);
  return (
    <div>
      <PageHeader
        title="Promotion plan"
        subtitle="Which product to promote, to which segment, in which city, at what discount — judged on incremental profit, inside hard price and stock rules."
      />
      <DashboardView
        rows={plan.rows}
        inventoryRows={plan.inventoryRows}
        config={config}
        seasonLabel={seasonFor(config.planningMonth, "Audio").label}
        cities={[...CITIES]}
        segments={[...SEGMENTS]}
        categories={[...CATEGORIES]}
      />
    </div>
  );
}
