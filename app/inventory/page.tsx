import InventoryTable, { type InventoryRow } from "@/components/InventoryTable";
import { PageHeader } from "@/components/ui";
import { stockStatus, stockStatusToRisk } from "@/lib/calculations";
import { getProduct, inventory, LOCATIONS } from "@/lib/dataset";

export const dynamic = "force-dynamic";

export default function InventoryPage() {
  const rows: InventoryRow[] = inventory
    .map((i) => {
      const product = getProduct(i.productId);
      const status = stockStatus(i.stock, i.reorderLevel);
      return {
        productId: i.productId,
        productName: product?.name ?? i.productId,
        category: product?.category ?? "-",
        location: i.location,
        stock: i.stock,
        reorderLevel: i.reorderLevel,
        predictedDemand: i.predictedDemand,
        status,
        risk: stockStatusToRisk(status),
      };
    })
    // most urgent first: lowest stock relative to reorder level
    .sort((a, b) => a.stock / a.reorderLevel - b.stock / b.reorderLevel);

  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle="Stock per product and location against its reorder level. Positions below the reorder level are highlighted. Predicted demand is the baseline across all customer segments."
      />
      <InventoryTable rows={rows} locations={LOCATIONS} />
    </div>
  );
}
