"use client";

import { useMemo, useState } from "react";
import { formatNumber } from "@/lib/format";
import type { FundingStatus, PlanRow } from "@/types";
import PlanTable from "./PlanTable";
import RejectedTable from "./RejectedTable";
import { Card, selectClass } from "./ui";

const TABS: { key: FundingStatus; label: string }[] = [
  { key: "funded", label: "In plan" },
  { key: "unfunded", label: "Not funded" },
  { key: "rejected", label: "Rejected" },
];

export default function RecommendationsView({ rows, cities, segments, categories }: { rows: PlanRow[]; cities: string[]; segments: string[]; categories: string[] }) {
  const [tab, setTab] = useState<FundingStatus>("funded");
  const [city, setCity] = useState("");
  const [segment, setSegment] = useState("");
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");

  const scoped = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      (r) => (!city || r.city === city) && (!segment || r.segment === segment) && (!category || r.category === category) && (!q || r.productName.toLowerCase().includes(q) || r.productId.toLowerCase().includes(q)),
    );
  }, [rows, city, segment, category, query]);
  const byTab = (s: FundingStatus) => scoped.filter((r) => r.status === s);
  const shown = useMemo(
    () => byTab(tab).sort((a, b) => (tab === "rejected" ? b.baselineProfit - a.baselineProfit : b.incrementalProfit - a.incrementalProfit)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scoped, tab],
  );

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 pt-3">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px rounded-t-lg border-b-2 px-4 py-2 text-sm font-medium ${tab === t.key ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            {t.label} <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{formatNumber(byTab(t.key).length)}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-3">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search product…" className={`${selectClass} w-44`} />
        <select className={selectClass} value={city} onChange={(e) => setCity(e.target.value)}><option value="">All cities</option>{cities.map((c) => <option key={c}>{c}</option>)}</select>
        <select className={selectClass} value={segment} onChange={(e) => setSegment(e.target.value)}><option value="">All segments</option>{segments.map((c) => <option key={c}>{c}</option>)}</select>
        <select className={selectClass} value={category} onChange={(e) => setCategory(e.target.value)}><option value="">All categories</option>{categories.map((c) => <option key={c}>{c}</option>)}</select>
        <span className="ml-auto text-xs text-slate-500">
          {tab === "funded" ? "Best incremental profit first" : tab === "unfunded" ? "Would pay off, but the budget or stock ran out first" : "Largest baseline profit first"}
        </span>
      </div>
      {tab === "rejected" ? (
        <RejectedTable key="rejected" rows={shown} />
      ) : (
        <PlanTable key={tab} rows={shown} showStatus={tab === "unfunded"} empty="Nothing here for these filters." />
      )}
    </Card>
  );
}
