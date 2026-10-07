import CustomerSegments from "@/components/CustomerSegments";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function CustomersPage() {
  return (
    <div>
      <PageHeader title="Customer Segments" subtitle="Who we are promoting to: size, favourite categories and spending behaviour." />
      <CustomerSegments />
    </div>
  );
}
