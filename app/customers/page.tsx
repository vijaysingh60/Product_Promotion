import SegmentsView from "@/components/SegmentsView";
import { PageHeader } from "@/components/ui";
import { getData } from "@/lib/db";

export default async function SegmentsPage() {
  const { data } = await getData();
  return (
    <div>
      <PageHeader title="Customer segments" subtitle="Segment-level only: how big each segment is, how price-sensitive, and what it wants. No individual customer data." />
      <SegmentsView profiles={data.data.segmentProfiles} sizes={data.data.segmentSizes} />
    </div>
  );
}
