import WhatIfSimulator from "@/components/WhatIfSimulator";
import { PageHeader } from "@/components/ui";
import { DISCOUNT_OPTIONS } from "@/lib/calculations";
import { LOCATIONS, products, SEGMENTS } from "@/lib/dataset";
import { simulate } from "@/lib/recommendationEngine";

type Params = Promise<Record<string, string | string[] | undefined>>;

export default async function SimulatorPage({ searchParams }: { searchParams: Params }) {
  const q = await searchParams;
  const one = (k: string) => (Array.isArray(q[k]) ? q[k][0] : q[k]);

  // Optional deep-link from the recommendation details page; otherwise start on the first product.
  const target = {
    productId: products.find((p) => p.id === one("product"))?.id ?? products[0].id,
    segment: SEGMENTS.find((s) => s === one("segment")) ?? SEGMENTS[0],
    location: LOCATIONS.find((l) => l === one("location")) ?? LOCATIONS[0],
  };
  const initial = await simulate(target);
  const asked = Number(one("discount"));
  const discount = DISCOUNT_OPTIONS.includes(asked) ? asked : initial.analysis.best.discount;

  return (
    <div>
      <PageHeader
        title="What-if Simulator"
        subtitle="Pick a product, segment and location, then change the discount to see how demand, revenue, profit, inventory and risk respond."
      />
      <WhatIfSimulator
        products={products.map(({ id, name, price }) => ({ id, name, price }))}
        segments={SEGMENTS}
        locations={LOCATIONS}
        initialTarget={target}
        initialDiscount={discount}
        initial={initial}
      />
    </div>
  );
}
