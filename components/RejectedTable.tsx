"use client";

import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { formatINR } from "@/lib/format";
import type { PlanRow } from "@/types";
import { ProductName, RiskBadge, ShowMore, VerdictBadge, td, th } from "./ui";

const PAGE = 12;

/** Every promotion the engine refused, with the reason. Click a reason chip to filter. */
export default function RejectedTable({ rows }: { rows: PlanRow[] }) {
  const [reason, setReason] = useState("");
  const [visible, setVisible] = useState(PAGE);

  const reasons = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => r.reason && m.set(r.reason, (m.get(r.reason) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);
  const filtered = useMemo(() => (reason ? rows.filter((r) => r.reason === reason) : rows), [rows, reason]);
  const pick = (r: string) => {
    setReason(r === reason ? "" : r);
    setVisible(PAGE);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
        <button
          onClick={() => pick("")}
          className={`rounded-full border px-3 py-1 text-xs font-medium ${reason === "" ? "border-slate-800 bg-slate-800 text-white" : "border-slate-300 text-slate-600 hover:bg-slate-50"}`}
        >
          All · {rows.length}
        </button>
        {reasons.map(([r, n]) => (
          <button
            key={r}
            onClick={() => pick(r)}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${reason === r ? "border-red-600 bg-red-600 text-white" : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"}`}
          >
            {r} · {n}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50">
            <tr>
              <th className={th}>Product</th>
              <th className={th}>Segment</th>
              <th className={th}>City</th>
              <th className={th}>Verdict</th>
              <th className={th}>Why it was rejected</th>
              <th className={th}>Risk</th>
              <th className={th}>Instead</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.slice(0, visible).map((r) => (
              <tr key={r.id} className="align-top hover:bg-slate-50">
                <td className={td}><ProductName name={r.productName} id={r.productId} href={`/recommendations/${r.id}`} /></td>
                <td className={td}>{r.segment}</td>
                <td className={td}>{r.city}</td>
                <td className={td}><VerdictBadge verdict={r.verdict} /></td>
                <td className={`${td} max-w-md whitespace-normal`}>
                  <div className="font-medium text-red-700">{r.reason}</div>
                  {r.detail && <div className="mt-0.5 text-xs leading-snug text-slate-500">{r.detail}</div>}
                </td>
                <td className={td}><RiskBadge risk={r.risk} /></td>
                <td className={`${td} whitespace-normal`}>
                  {r.alternative ? (
                    <div className="flex items-start gap-1.5 text-xs">
                      <ArrowRight size={13} className="mt-0.5 shrink-0 text-sky-600" />
                      <span>
                        Promote <strong>{r.alternative.productName}</strong> at {r.alternative.discountPct}% (+{formatINR(r.alternative.incrementalProfit)})
                        {!r.alternative.funded && <span className="text-amber-700"> · not funded</span>}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">Nothing rejected for these filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {filtered.length > visible && <ShowMore remaining={filtered.length - visible} onClick={() => setVisible((v) => v + PAGE)} />}
    </div>
  );
}
