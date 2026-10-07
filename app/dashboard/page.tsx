import DashboardCards from "@/components/DashboardCards";
import DashboardCharts from "@/components/DashboardCharts";
import FormulaBanner from "@/components/FormulaBanner";
import RecommendationTable from "@/components/RecommendationTable";
import { Card, ModelStatus, PageHeader } from "@/components/ui";
import { stockStatus } from "@/lib/calculations";
import { customers, inventory, LOCATIONS, products, SEGMENTS } from "@/lib/dataset";
import { getAllRecommendations, toRow } from "@/lib/recommendationEngine";
import type { Recommendation } from "@/types";

export const dynamic = "force-dynamic"; // predictions come from the ML service at request time

export default async function DashboardPage() {
  const { rows: all, source } = await getAllRecommendations(); // already sorted by score
  const recommended = all.filter((r) => r.status === "Recommended");

  const statuses = inventory.map((i) => ({ ...i, status: stockStatus(i.stock, i.reorderLevel) }));
  const criticalLocations = new Map<string, number>();
  statuses
    .filter((i) => i.status === "Critical")
    .forEach((i) => criticalLocations.set(i.productId, (criticalLocations.get(i.productId) ?? 0) + 1));

  const stats = {
    totalProducts: products.length,
    totalCustomers: customers.length,
    availableInventory: inventory.reduce((s, i) => s + i.stock, 0),
    recommendedPromotions: recommended.length,
    totalPromotions: all.length,
    highRiskProducts: [...criticalLocations.values()].filter((n) => n >= 3).length,
  };

  const segmentProfit = SEGMENTS.map((segment) => ({
    segment,
    profit: recommended.filter((r) => r.segment === segment).reduce((s, r) => s + r.expectedProfit, 0),
  }));
  const locationStock = LOCATIONS.map((location) => {
    const here = statuses.filter((i) => i.location === location);
    return {
      location,
      Healthy: here.filter((i) => i.status === "Healthy").length,
      "Low Stock": here.filter((i) => i.status === "Low Stock").length,
      Critical: here.filter((i) => i.status === "Critical").length,
    };
  });

  // Snapshot: best promotions plus a few that need attention, one row per product,
  // so all three outcomes are visible.
  const distinct = (rows: Recommendation[], n: number) =>
    rows.filter((r, i) => rows.findIndex((x) => x.productId === r.productId) === i).slice(0, n);
  const snapshot = [
    ...distinct(recommended, 5),
    ...distinct(all.filter((r) => r.status === "Review"), 2),
    ...distinct(all.filter((r) => r.status === "Not Recommended"), 2),
  ].map(toRow);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Which product should we promote, to which customer segment, at what discount — given demand, inventory and profit."
      >
        <ModelStatus source={source} />
      </PageHeader>
      <FormulaBanner />
      <DashboardCards stats={stats} />
      <Card title="AI-generated promotion recommendations" subtitle="Top-scoring promotions, plus examples that need review or are not recommended">
        <RecommendationTable rows={snapshot} />
      </Card>
      <DashboardCharts segmentProfit={segmentProfit} locationStock={locationStock} />
    </div>
  );
}
