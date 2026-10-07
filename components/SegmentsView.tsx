import { formatNumber } from "@/lib/format";
import { CATEGORIES, CITIES, segmentProfiles, segmentSizes } from "@/lib/mockData";
import type { Category, Segment } from "@/types";
import { Card, MeterBar, td, th, thRight } from "./ui";

const ACCENT = ["border-t-sky-500", "border-t-indigo-500", "border-t-emerald-500", "border-t-amber-500"];

function Heat({ matrix, title, subtitle }: { matrix: (s: Segment) => Record<Category, number>; title: string; subtitle: string }) {
  return (
    <Card title={title} subtitle={subtitle}>
      <div className="overflow-x-auto p-3">
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              <th className={th}>Segment</th>
              {CATEGORIES.map((c) => <th key={c} className={`${th} text-center`}>{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {segmentProfiles.map((p) => (
              <tr key={p.segment}>
                <td className={`${td} font-medium text-slate-900`}>{p.segment}</td>
                {CATEGORIES.map((c) => {
                  const v = matrix(p.segment)[c];
                  return (
                    <td key={c} className="p-1 text-center">
                      <div className="rounded-md py-1.5 text-xs font-medium" style={{ background: `rgba(79,70,229,${(v * 0.85).toFixed(2)})`, color: v > 0.5 ? "#fff" : "#334155" }}>
                        {Math.round(v * 100)}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/** Segment-level view only: who we can reach, how price-sensitive they are, what they like. No individual customers. */
export default function SegmentsView() {
  const total = (s: Segment) => CITIES.reduce((sum, c) => sum + segmentSizes[c][s], 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {segmentProfiles.map((p, i) => {
          const top = [...CATEGORIES].sort((a, b) => p.affinity[b] - p.affinity[a]).slice(0, 3);
          return (
            <div key={p.segment} className={`rounded-xl border border-slate-200 border-t-4 bg-white p-5 shadow-sm ${ACCENT[i % ACCENT.length]}`}>
              <h3 className="font-semibold text-slate-900">{p.segment}</h3>
              <div className="mt-0.5 text-2xl font-semibold tabular-nums text-slate-900">{formatNumber(total(p.segment))}<span className="ml-1 text-xs font-normal text-slate-500">reachable customers</span></div>
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <div className="flex justify-between"><dt className="text-slate-500">Price sensitivity</dt><dd className="font-medium">{Math.round(p.priceSensitivity * 100)}/100</dd></div>
                  <div className="mt-1"><MeterBar value={p.priceSensitivity * 100} /></div>
                </div>
                <div className="flex justify-between"><dt className="text-slate-500">Messages, last 30 days</dt><dd className="font-medium">{p.recentContacts}</dd></div>
                <div className="flex justify-between gap-3"><dt className="shrink-0 text-slate-500">Top categories</dt><dd className="text-right font-medium">{top.join(", ")}</dd></div>
              </dl>
            </div>
          );
        })}
      </div>

      <Heat matrix={(s) => segmentProfiles.find((p) => p.segment === s)!.affinity} title="Affinity by category" subtitle="Long-run preference, 0–100. Feeds the response model and each segment's share of sales." />
      <Heat matrix={(s) => segmentProfiles.find((p) => p.segment === s)!.intent} title="Recent intent by category" subtitle="Browsing and cart activity in the last weeks, 0–100. Feeds the response model." />

      <Card title="Reachable customers by city" subtitle="Audience sizes are capped by stock, so a promotion may contact only part of a segment.">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th className={th}>City</th>
                {segmentProfiles.map((p) => <th key={p.segment} className={thRight}>{p.segment}</th>)}
                <th className={thRight}>Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {CITIES.map((c) => (
                <tr key={c}>
                  <td className={`${td} font-medium text-slate-900`}>{c}</td>
                  {segmentProfiles.map((p) => <td key={p.segment} className={`${td} text-right tabular-nums`}>{formatNumber(segmentSizes[c][p.segment])}</td>)}
                  <td className={`${td} text-right font-semibold tabular-nums`}>{formatNumber(segmentProfiles.reduce((s, p) => s + segmentSizes[c][p.segment], 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
