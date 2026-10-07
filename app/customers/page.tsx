import SegmentsView from "@/components/SegmentsView";
import { PageHeader } from "@/components/ui";

export default function SegmentsPage() {
  return (
    <div>
      <PageHeader title="Customer segments" subtitle="Segment-level only: how big each segment is, how price-sensitive, and what it wants. No individual customer data." />
      <SegmentsView />
    </div>
  );
}
