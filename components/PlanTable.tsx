"use client";

import { useState } from "react";
import { formatINR, formatNumber } from "@/lib/format";
import type { PlanRow } from "@/types";
import { ClearanceBadge, ProductName, RiskBadge, ShowMore, StatusBadge, td, tdRight, th, thRight } from "./ui";

const PAGE = 15;

/** Promotions the engine wants to run (or, with showStatus, any candidate). Notes appear under the product. */
export default function PlanTable({ rows, showStatus = false, empty = "No promotions in the plan for these filters." }: {
  rows: PlanRow[];
  showStatus?: boolean;
  empty?: string;
}) {
  const [visible, setVisible] = useState(PAGE);
  const shown = rows.slice(0, visible);

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50">
            <tr>
              <th className={th}>Product</th>
              <th className={th}>Segment</th>
              <th className={th}>City</th>
              <th className={thRight}>Discount</th>
              <th className={thRight}>Audience</th>
              <th className={thRight}>Pred. demand</th>
              <th className={thRight}>Servable</th>
              <th className={thRight}>Incr. profit</th>
              <th className={thRight}>ROI</th>
              <th className={th}>Risk</th>
              {showStatus && <th className={th}>Status</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {shown.map((r) => (
              <tr key={r.id} className="align-top hover:bg-slate-50">
                <td className={`${td} whitespace-normal`}>
                  <div className="whitespace-nowrap">
                    <ProductName name={r.productName} id={r.productId} href={`/recommendations/${r.id}`} />
                    {r.kind === "clearance" && <span className="ml-2"><ClearanceBadge /></span>}
                  </div>
                  {r.notes.filter((n) => n.startsWith("audience reduced") || n.startsWith("response lowered")).map((n) => (
                    <div key={n} className="mt-0.5 max-w-xs text-[11px] leading-snug text-amber-700">⚠ {n}</div>
                  ))}
                </td>
                <td className={td}>{r.segment}</td>
                <td className={td}>{r.city}</td>
                <td className={`${tdRight} font-medium`}>{r.discountPct === null ? "—" : `${r.discountPct}%`}</td>
                <td className={tdRight}>
                  {formatNumber(r.audience)}
                  <span className="text-xs text-slate-400"> / {formatNumber(r.segmentSize)}</span>
                </td>
                <td className={tdRight}>{formatNumber(r.predictedDemand)}</td>
                <td className={tdRight}>{formatNumber(r.unitsServable)}</td>
                <td className={`${tdRight} font-semibold ${r.incrementalProfit < 0 ? "text-red-600" : "text-slate-900"}`}>{formatINR(r.incrementalProfit)}</td>
                <td className={tdRight}>{r.roi > 0 ? `${r.roi.toFixed(1)}×` : "—"}</td>
                <td className={td}><RiskBadge risk={r.risk} /></td>
                {showStatus && (
                  <td className={td}>
                    <StatusBadge status={r.status} />
                    {r.reason && <div className="mt-0.5 max-w-[14rem] whitespace-normal text-[11px] leading-snug text-slate-500">{r.reason}</div>}
                  </td>
                )}
              </tr>
            ))}
            {shown.length === 0 && (
              <tr><td colSpan={11} className="px-4 py-10 text-center text-sm text-slate-500">{empty}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {rows.length > visible && <ShowMore remaining={rows.length - visible} onClick={() => setVisible((v) => v + PAGE)} />}
    </div>
  );
}
