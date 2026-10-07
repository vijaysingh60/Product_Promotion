import WhatIfSimulator from "@/components/WhatIfSimulator";
import { PageHeader } from "@/components/ui";
import { CITIES, products, SEGMENTS } from "@/lib/mockData";
import { getConfig } from "@/lib/serverConfig";

type Params = Promise<Record<string, string | string[] | undefined>>;

export default async function SimulatorPage({ searchParams }: { searchParams: Params }) {
  const q = await searchParams;
  const one = (k: string) => (Array.isArray(q[k]) ? q[k][0] : q[k]);
  const config = await getConfig();

  // Optional deep-link from a recommendation (?product=&segment=&city=&discount=).
  const asked = Number(one("discount"));
  const initial = {
    productId: products.find((p) => p.id === one("product"))?.id ?? "p01",
    segment: SEGMENTS.find((s) => s === one("segment")) ?? SEGMENTS[0],
    city: CITIES.find((c) => c === one("city")) ?? CITIES[0],
    discount: Number.isFinite(asked) && one("discount") ? asked : null,
  };

  return (
    <div>
      <PageHeader
        title="What-if simulator"
        subtitle="Pick a product, segment and city, then move the discount. The slider stops at the deepest discount that still leaves CP + the margin floor."
      />
      <WhatIfSimulator
        config={config}
        products={products.map(({ id, name, mrp }) => ({ id, name, mrp }))}
        segments={[...SEGMENTS]}
        cities={[...CITIES]}
        initial={initial}
      />
    </div>
  );
}
