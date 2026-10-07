"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatINR, formatNumber } from "@/lib/calculations";
import type { RecommendationRow, RecommendationStatus } from "@/types";
import { ProductName, RiskBadge, ScoreBar, selectClass, StatusBadge, td, th } from "./ui";

const PAGE_SIZE = 20;
const STATUSES: RecommendationStatus[] = ["Recommended", "Review", "Not Recommended"];

interface Props {
  rows: RecommendationRow[];
  /** Show all fields (price, inventory, demand, revenue, profit) + filters. Otherwise the compact dashboard view. */
  detailed?: boolean;
  segments?: string[];
  locations?: string[];
}

export default function RecommendationTable({ rows, detailed = false, segments = [], locations = [] }: Props) {
  const [segment, setSegment] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (!segment || r.segment === segment) &&
        (!location || r.location === location) &&
        (!status || r.status === status) &&
        (!q || r.productName.toLowerCase().includes(q) || r.productId.toLowerCase().includes(q)),
    );
  }, [rows, segment, location, status, query]);
  const shown = detailed ? filtered.slice(0, visible) : filtered;

  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setVisible(PAGE_SIZE);
  };

  return (
    <div>
      {detailed && (
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
          <input
            value={query}
            onChange={(e) => reset(setQuery)(e.target.value)}
            placeholder="Search product or ID…"
            className={`${selectClass} w-52`}
          />
          <select className={selectClass} value={segment} onChange={(e) => reset(setSegment)(e.target.value)}>
            <option value="">All segments</option>
            {segments.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select className={selectClass} value={location} onChange={(e) => reset(setLocation)(e.target.value)}>
            <option value="">All locations</option>
            {locations.map((l) => <option key={l}>{l}</option>)}
          </select>
          <select className={selectClass} value={status} onChange={(e) => reset(setStatus)(e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <span className="ml-auto text-xs text-slate-500">{formatNumber(filtered.length)} promotions · sorted by score</span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50">
            <tr>
              <th className={th}>Product</th>
              <th className={th}>Customer Segment</th>
              <th className={th}>Location</th>
              {detailed && <th className={th}>Price</th>}
              <th className={th}>Discount</th>
              {detailed && <th className={th}>Inventory</th>}
              {detailed && <th className={th}>Pred. Demand</th>}
              <th className={th}>Score</th>
              <th className={th}>Risk</th>
              {detailed && <th className={th}>Exp. Revenue</th>}
              {detailed && <th className={th}>Exp. Profit</th>}
              <th className={th}>Recommendation</th>
              <th className={th} />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {shown.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className={td}><ProductName name={r.productName} id={r.productId} /></td>
                <td className={td}>{r.segment}</td>
                <td className={td}>{r.location}</td>
                {detailed && <td className={td}>{formatINR(r.price)}</td>}
                <td className={`${td} font-medium`}>{r.discount}%</td>
                {detailed && <td className={td}>{formatNumber(r.inventory)} units</td>}
                {detailed && <td className={td}>{formatNumber(r.predictedDemand)} units</td>}
                <td className={td}><ScoreBar score={r.score} /></td>
                <td className={td}><RiskBadge risk={r.risk} /></td>
                {detailed && <td className={td}>{formatINR(r.expectedRevenue)}</td>}
                {detailed && <td className={td}>{formatINR(r.expectedProfit)}</td>}
                <td className={td}><StatusBadge status={r.status} /></td>
                <td className={td}>
                  <Link
                    href={`/recommendations/${r.id}`}
                    className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                  >
                    View Details
                  </Link>
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={13} className="px-4 py-10 text-center text-sm text-slate-500">
                  No promotions match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {detailed && filtered.length > visible && (
        <div className="border-t border-slate-100 p-4 text-center">
          <button
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Show more ({formatNumber(filtered.length - visible)} remaining)
          </button>
        </div>
      )}
    </div>
  );
}
