import InventoryTable from "@/components/InventoryTable";
import { PageHeader } from "@/components/ui";
import { buildPlanFor } from "@/lib/plan";
import { CATEGORIES, CITIES } from "@/lib/mockData";
import { getConfig } from "@/lib/serverConfig";

export default async function InventoryPage() {
  const config = await getConfig();
  const plan = buildPlanFor(config);
  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle={`Stock per product and city. Safety stock (${config.safetyStockPct}%) is never sold, days of cover use the current sales rate with this month's season, and demand covers the next ${config.horizonDays} days.`}
      />
      <InventoryTable rows={plan.inventoryRows} cities={[...CITIES]} categories={[...CATEGORIES]} />
    </div>
  );
}
