import { formatINR, formatNumber, segmentMetrics } from "@/lib/calculations";
import { customers, SEGMENTS } from "@/lib/dataset";
import { Card, td, th } from "./ui";

const ACCENT = ["border-t-sky-500", "border-t-indigo-500", "border-t-emerald-500", "border-t-amber-500"];
const SAMPLE = 100;

export default function CustomerSegments() {
  const metrics = SEGMENTS.map((s) => segmentMetrics(s, customers));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m, i) => (
          <div key={m.segment} className={`rounded-xl border border-slate-200 border-t-4 bg-white p-5 shadow-sm ${ACCENT[i % ACCENT.length]}`}>
            <h3 className="font-semibold text-slate-900">{m.segment}</h3>
            <dl className="mt-4 space-y-3 text-sm">
              <Row label="Customers" value={formatNumber(m.customers)} />
              <Row label="Top category" value={m.topCategory} />
              <Row label="Avg. spend / month" value={formatINR(m.avgMonthlySpend)} />
              <Row label="Purchase frequency" value={`${m.purchaseFrequency.toFixed(1)} orders / mo`} />
              <Row label="Avg. age" value={`${Math.round(m.avgAge)} yrs`} />
            </dl>
          </div>
        ))}
      </div>

      <Card title="Customers" subtitle={`Showing the first ${SAMPLE} of ${formatNumber(customers.length)} customers in the dataset`}>
        <div className="max-h-[32rem] overflow-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="sticky top-0 bg-slate-50">
              <tr>
                <th className={th}>Customer</th>
                <th className={th}>Segment</th>
                <th className={th}>Location</th>
                <th className={th}>Age</th>
                <th className={th}>Preferred category</th>
                <th className={th}>Spend / month</th>
                <th className={th}>Orders / mo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.slice(0, SAMPLE).map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className={`${td} font-medium text-slate-900`}>{c.id}</td>
                  <td className={td}>{c.segment}</td>
                  <td className={td}>{c.location}</td>
                  <td className={td}>{c.age}</td>
                  <td className={td}>{c.preferredCategory}</td>
                  <td className={td}>{formatINR(c.avgMonthlySpend)}</td>
                  <td className={td}>{c.purchaseFrequency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-900">{value}</dd>
    </div>
  );
}
