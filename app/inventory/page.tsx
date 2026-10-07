import InventoryTable from "@/components/InventoryTable";
import { PageHeader } from "@/components/ui";
import { getData } from "@/lib/db";
import { buildPlanFor } from "@/lib/plan";
import { getConfig } from "@/lib/serverConfig";
import { CATEGORY_NAMES, CITY_NAMES } from "@/types";

export default async function InventoryPage() {
  const config = await getConfig();
  const { data } = await getData();
  const plan = buildPlanFor(config, data);
  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle={`Stock per product and city. Safety stock (${config.safetyStockPct}%) is never sold, days of cover use the current sales rate with this month's season, and demand covers the next ${config.horizonDays} days.`}
      />
      <InventoryTable rows={plan.inventoryRows} cities={[...CITY_NAMES]} categories={[...CATEGORY_NAMES]} />
    </div>
  );
}
