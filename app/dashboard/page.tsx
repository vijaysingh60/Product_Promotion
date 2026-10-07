import DashboardView from "@/components/DashboardView";
import { PageHeader } from "@/components/ui";
import { getData } from "@/lib/db";
import { buildPlanFor } from "@/lib/plan";
import { getConfig } from "@/lib/serverConfig";
import { CATEGORY_NAMES, CITY_NAMES, SEGMENT_NAMES } from "@/types";

export default async function DashboardPage() {
  const config = await getConfig();
  const { data } = await getData();
  const plan = buildPlanFor(config, data);
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
        seasonLabel={data.season(config.planningMonth, "Audio").label}
        cities={[...CITY_NAMES]}
        segments={[...SEGMENT_NAMES]}
        categories={[...CATEGORY_NAMES]}
      />
    </div>
  );
}
