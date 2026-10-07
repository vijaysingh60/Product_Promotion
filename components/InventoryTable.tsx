"use client";

import { useMemo, useState } from "react";
import { Info } from "lucide-react";
import { formatINRCompact, formatNumber } from "@/lib/format";
import type { InventoryRow, StockStatus } from "@/types";
import { Card, ProductName, RiskBadge, selectClass, ShowMore, StockBadge, td, tdRight, th, thRight } from "./ui";

const PAGE = 30;
const STATUSES: StockStatus[] = ["Stockout risk", "Low", "Overstock", "Healthy"];
const SORTS = {
  risk: "Risk (most urgent first)",
  cover: "Days of cover (lowest first)",
  stock: "Stock (highest first)",
  value: "Inventory value (highest first)",
} as const;
type SortKey = keyof typeof SORTS;

export default function InventoryTable({ rows, cities, categories }: { rows: InventoryRow[]; cities: string[]; categories: string[] }) {
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("risk");
  const [visible, setVisible] = useState(PAGE);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter(
      (r) => (!city || r.city === city) && (!category || r.category === category) && (!status || r.status === status) && (!q || r.productName.toLowerCase().includes(q) || r.productId.toLowerCase().includes(q)),
    );
    const order = (r: InventoryRow) => STATUSES.indexOf(r.status);
    return [...list].sort((a, b) =>
      sort === "risk" ? order(a) - order(b) || a.daysOfCover - b.daysOfCover
      : sort === "cover" ? a.daysOfCover - b.daysOfCover
      : sort === "stock" ? b.stock - a.stock
      : b.inventoryValue - a.inventoryValue,
    );
  }, [rows, city, category, status, query, sort]);

  const scope = rows.filter((r) => (!city || r.city === city) && (!category || r.category === category));
  const count = (s: StockStatus) => scope.filter((r) => r.status === s).length;
  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setVisible(PAGE);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => reset(setStatus)(status === s ? "" : s)}
            className={`rounded-xl border p-3 text-left shadow-sm ${status === s ? "border-indigo-500 ring-1 ring-indigo-500" : "border-slate-200"} bg-white`}
          >
            <StockBadge status={s} />
            <div className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{count(s)}</div>
            <div className="text-[11px] text-slate-500">
              {s === "Stockout risk" ? "positions with too little cover" : s === "Low" ? "positions running thin" : s === "Overstock" ? "positions needing clearance" : "positions in the comfort zone"}
            </div>
          </button>
        ))}
      </div>

      <div className="flex gap-3 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
        <Info size={17} className="mt-0.5 shrink-0" />
        <div>Stock is tracked per city. A city is never promoted using another city&apos;s stock, so each row below is judged on its own. Demand in red is higher than the stock on hand.</div>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-3">
          <input value={query} onChange={(e) => reset(setQuery)(e.target.value)} placeholder="Search product…" className={`${selectClass} w-44`} />
          <select className={selectClass} value={city} onChange={(e) => reset(setCity)(e.target.value)}>
            <option value="">All cities</option>{cities.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select className={selectClass} value={category} onChange={(e) => reset(setCategory)(e.target.value)}>
            <option value="">All categories</option>{categories.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select className={selectClass} value={status} onChange={(e) => reset(setStatus)(e.target.value)}>
            <option value="">All statuses</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select className={selectClass} value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>Sort: {v}</option>)}
          </select>
          <span className="ml-auto text-xs text-slate-500">{filtered.length} positions · {formatINRCompact(filtered.reduce((s, r) => s + r.inventoryValue, 0))} at cost</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th className={th}>Product</th>
                <th className={th}>City</th>
                <th className={thRight}>Stock</th>
                <th className={thRight}>Safety stock</th>
                <th className={thRight}>Safe units</th>
                <th className={thRight}>Pred. demand</th>
                <th className={thRight}>Days of cover</th>
                <th className={th}>Status</th>
                <th className={th}>Risk</th>
                <th className={thRight}>In plan</th>
                <th className={thRight}>Cover after plan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.slice(0, visible).map((r) => (
                <tr key={`${r.productId}|${r.city}`} className={r.status === "Stockout risk" ? "bg-red-50/60" : r.status === "Low" ? "bg-amber-50/40" : r.status === "Overstock" ? "bg-violet-50/40" : "hover:bg-slate-50"}>
                  <td className={td}><ProductName name={r.productName} id={r.productId} /><span className="ml-2 text-[11px] text-slate-400">{r.category}</span></td>
                  <td className={td}>{r.city}</td>
                  <td className={tdRight}>{formatNumber(r.stock)}</td>
                  <td className={tdRight}>{formatNumber(r.safetyStock)}</td>
                  <td className={tdRight}>{formatNumber(r.safeUnits)}</td>
                  <td className={`${tdRight} ${r.predictedDemand > r.stock ? "font-semibold text-red-600" : ""}`}>{formatNumber(r.predictedDemand)}</td>
                  <td className={`${tdRight} font-medium`}>{r.daysOfCover.toFixed(0)} d</td>
                  <td className={td}><StockBadge status={r.status} /></td>
                  <td className={td}><RiskBadge risk={r.risk} /></td>
                  <td className={tdRight}>{r.plannedUnits > 0 ? `+${formatNumber(r.plannedUnits)} units` : "—"}</td>
                  <td className={tdRight}>{r.plannedUnits > 0 ? `${r.daysOfCoverAfterPlan.toFixed(0)} d` : "—"}</td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={11} className="px-4 py-10 text-center text-sm text-slate-500">No positions match these filters.</td></tr>}
            </tbody>
          </table>
        </div>
        {filtered.length > visible && <ShowMore remaining={filtered.length - visible} onClick={() => setVisible((v) => v + PAGE)} />}
      </Card>
    </div>
  );
}
