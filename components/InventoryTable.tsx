"use client";

import { useMemo, useState } from "react";
import { TriangleAlert } from "lucide-react";
import { formatNumber } from "@/lib/calculations";
import type { RiskLevel, StockStatus } from "@/types";
import { Card, ProductName, RiskBadge, selectClass, StockBadge, td, th } from "./ui";

export interface InventoryRow {
  productId: string;
  productName: string;
  category: string;
  location: string;
  stock: number;
  reorderLevel: number;
  predictedDemand: number;
  status: StockStatus;
  risk: RiskLevel;
}

const PAGE_SIZE = 25;
const STATUSES: StockStatus[] = ["Critical", "Low Stock", "Healthy"];

/** rows arrive sorted most-urgent first. */
export default function InventoryTable({ rows, locations }: { rows: InventoryRow[]; locations: string[] }) {
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const inLocation = useMemo(() => rows.filter((r) => !location || r.location === location), [rows, location]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return inLocation.filter(
      (r) =>
        (!status || r.status === status) &&
        (!q || r.productName.toLowerCase().includes(q) || r.productId.toLowerCase().includes(q)),
    );
  }, [inLocation, status, query]);

  const critical = inLocation.filter((r) => r.status === "Critical").length;
  const low = inLocation.filter((r) => r.status === "Low Stock").length;
  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setVisible(PAGE_SIZE);
  };

  return (
    <div className="space-y-4">
      {critical + low > 0 && (
        <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <TriangleAlert size={18} className="mt-0.5 shrink-0" />
          <div>
            <strong>{formatNumber(critical + low)} of {formatNumber(inLocation.length)} stock positions</strong> in{" "}
            {location || "all locations"} are below their reorder level ({formatNumber(critical)} critical,{" "}
            {formatNumber(low)} low). Avoid deep discounts on these until stock is replenished.
          </div>
        </div>
      )}
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
          <input
            value={query}
            onChange={(e) => reset(setQuery)(e.target.value)}
            placeholder="Search product or ID…"
            className={`${selectClass} w-52`}
          />
          <select className={selectClass} value={location} onChange={(e) => reset(setLocation)(e.target.value)}>
            <option value="">All locations</option>
            {locations.map((l) => <option key={l}>{l}</option>)}
          </select>
          <select className={selectClass} value={status} onChange={(e) => reset(setStatus)(e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <span className="ml-auto text-xs text-slate-500">{formatNumber(filtered.length)} stock positions · most urgent first</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th className={th}>Product</th>
                <th className={th}>Category</th>
                <th className={th}>Location</th>
                <th className={th}>Current Stock (units)</th>
                <th className={th}>Reorder Level</th>
                <th className={th}>Predicted Demand</th>
                <th className={th}>Stock Status</th>
                <th className={th}>Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.slice(0, visible).map((r) => (
                <tr
                  key={`${r.productId}|${r.location}`}
                  className={r.status === "Critical" ? "bg-red-50/70" : r.status === "Low Stock" ? "bg-amber-50/50" : "hover:bg-slate-50"}
                >
                  <td className={td}><ProductName name={r.productName} id={r.productId} /></td>
                  <td className={td}>{r.category}</td>
                  <td className={td}>{r.location}</td>
                  <td className={td}>
                    {formatNumber(r.stock)}
                    {r.stock < r.reorderLevel && (
                      <span className="ml-2 text-xs font-medium text-red-600">{formatNumber(r.reorderLevel - r.stock)} short</span>
                    )}
                  </td>
                  <td className={td}>{formatNumber(r.reorderLevel)}</td>
                  <td className={td}>{formatNumber(r.predictedDemand)}</td>
                  <td className={td}><StockBadge status={r.status} /></td>
                  <td className={td}><RiskBadge risk={r.risk} /></td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500">No stock positions match these filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > visible && (
          <div className="border-t border-slate-100 p-4 text-center">
            <button
              onClick={() => setVisible((v) => v + PAGE_SIZE)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Show more ({formatNumber(filtered.length - visible)} remaining)
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}
