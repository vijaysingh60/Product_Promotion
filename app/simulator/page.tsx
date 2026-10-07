import WhatIfSimulator from "@/components/WhatIfSimulator";
import { PageHeader } from "@/components/ui";
import { getData } from "@/lib/db";
import { getConfig } from "@/lib/serverConfig";
import { CITY_NAMES, SEGMENT_NAMES } from "@/types";

type Params = Promise<Record<string, string | string[] | undefined>>;

export default async function SimulatorPage({ searchParams }: { searchParams: Params }) {
  const q = await searchParams;
  const one = (k: string) => (Array.isArray(q[k]) ? q[k][0] : q[k]);
  const config = await getConfig();
  const { data } = await getData();
  const products = data.data.products;

  // Optional deep-link from a recommendation (?product=&segment=&city=&discount=).
  const asked = Number(one("discount"));
  const initial = {
    productId: products.find((p) => p.id === one("product"))?.id ?? products[0].id,
    segment: SEGMENT_NAMES.find((s) => s === one("segment")) ?? SEGMENT_NAMES[0],
    city: CITY_NAMES.find((c) => c === one("city")) ?? CITY_NAMES[0],
    discount: Number.isFinite(asked) && one("discount") ? asked : null,
  };

  return (
    <div>
      <PageHeader
        title="What-if simulator"
        subtitle="Pick a product, segment and city, then move the discount. The slider stops at the deepest discount that still leaves CP + the margin floor."
      />
      {/* The simulator runs the same pure engine in the browser, so it receives the dataset. */}
      <WhatIfSimulator config={config} dataset={data.data} segments={[...SEGMENT_NAMES]} cities={[...CITY_NAMES]} initial={initial} />
    </div>
  );
}
