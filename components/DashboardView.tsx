"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Boxes, Layers, Megaphone, Percent, Wallet, XCircle } from "lucide-react";
import {
  filterInventory, filterRows, groupIncremental, headline, kpis, NO_FILTERS, riskDistribution, scatterPoints, stockVsDemand,
  topProducts, waterfall, type Filters,
} from "@/lib/analytics";
import { formatINR, formatINRCompact, formatNumber } from "@/lib/format";
import type { EngineConfig, InventoryRow, PlanRow } from "@/types";
import DashboardCharts from "./DashboardCharts";
import PlanTable from "./PlanTable";
import RejectedTable from "./RejectedTable";
import SettingsPanel from "./SettingsPanel";
import { Card, selectClass } from "./ui";

interface Props {
  rows: PlanRow[];
  inventoryRows: InventoryRow[];
  config: EngineConfig;
  seasonLabel: string;
  cities: string[];
  segments: string[];
  categories: string[];
}

export default function DashboardView({ rows, inventoryRows, config, seasonLabel, cities, segments, categories }: Props) {
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const set = (key: keyof Filters) => (e: React.ChangeEvent<HTMLSelectElement>) => setFilters({ ...filters, [key]: e.target.value });
  const active = Object.values(filters).some(Boolean);

  const view = useMemo(() => {
    const r = filterRows(rows, filters);
    const inv = filterInventory(inventoryRows, filters);
    return {
      rows: r,
      head: headline(r, config.marketingBudget),
      kpi: kpis(r, inv),
      plan: r.filter((x) => x.status === "funded").sort((a, b) => b.incrementalProfit - a.incrementalProfit),
      rejected: r.filter((x) => x.status === "rejected").sort((a, b) => b.baselineProfit - a.baselineProfit),
      charts: {
        waterfall: waterfall(r),
        byCity: groupIncremental(r, "city", filters.city ? [filters.city] : cities),
        bySegment: groupIncremental(r, "segment", filters.segment ? [filters.segment] : segments),
        top: topProducts(r, 5),
        scatter: scatterPoints(r),
        stock: stockVsDemand(inv),
        risk: riskDistribution(r),
      },
    };
  }, [rows, inventoryRows, filters, config.marketingBudget, cities, segments]);

  const { head, kpi } = view;
  const budgetPct = head.budgetTotal > 0 ? Math.min(100, (head.budgetUsed / head.budgetTotal) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* ------------------------------------------------------ headline */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Baseline profit · next {config.horizonDays} days</div>
          <div className="mt-2 text-3xl font-semibold tabular-nums text-slate-900">{formatINRCompact(head.baselineProfit)}</div>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            <strong className="text-slate-600">Baseline</strong> = profit we expect if <em>no promotion runs</em>: current sales at full price (MRP), after returns, limited by safe stock.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Projected profit with plan</div>
          <div className="mt-2 text-3xl font-semibold tabular-nums text-slate-900">{formatINRCompact(head.projectedProfit)}</div>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">Baseline plus the funded promotions, after their marketing cost. Season: {seasonLabel}.</p>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 p-5 text-white shadow-sm lg:col-span-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-emerald-100">Incremental profit</div>
          <div className="mt-1 whitespace-nowrap text-4xl font-semibold tabular-nums xl:text-5xl">
            {head.incrementalProfit >= 0 ? "+" : "-"}{formatINR(Math.abs(head.incrementalProfit))}
          </div>
          <div className="mt-0.5 text-lg font-medium text-emerald-100">{head.incrementalPct >= 0 ? "+" : ""}{head.incrementalPct.toFixed(2)}% on baseline</div>
          <p className="mt-2 text-xs leading-relaxed text-emerald-100">Extra profit versus doing nothing — not total sales. Customers who would have bought anyway are already netted out.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Marketing budget</div>
          <div className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">
            {formatINRCompact(head.budgetUsed)} <span className="text-sm font-normal text-slate-400">/ {formatINRCompact(head.budgetTotal)}</span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-indigo-500" style={{ width: `${budgetPct}%` }} /></div>
          <p className="mt-2 text-xs text-slate-500">₹{config.costPerContact} per contact</p>
        </div>
      </div>

      {/* -------------------------------------------------------- filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Filters</span>
        <select className={selectClass} value={filters.city} onChange={set("city")}>
          <option value="">All cities</option>{cities.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select className={selectClass} value={filters.segment} onChange={set("segment")}>
          <option value="">All segments</option>{segments.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select className={selectClass} value={filters.category} onChange={set("category")}>
          <option value="">All categories</option>{categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select className={selectClass} value={filters.risk} onChange={set("risk")}>
          <option value="">All risk levels</option>{["Low", "Medium", "High"].map((c) => <option key={c}>{c}</option>)}
        </select>
        {active && <button onClick={() => setFilters(NO_FILTERS)} className="text-sm font-medium text-indigo-600 hover:text-indigo-700">Clear</button>}
        <span className="ml-auto text-xs text-slate-500">Charts, KPIs and tables all follow these filters</span>
      </div>

      {/* ------------------------------------------------------------ KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <Kpi icon={Megaphone} tone="text-emerald-600 bg-emerald-50" label="Promotions recommended" value={formatNumber(kpi.recommended)}
          note={kpi.notFunded > 0 ? `+${formatNumber(kpi.notFunded)} good ones not funded (budget)` : "all fundable promotions funded"} />
        <Kpi icon={XCircle} tone="text-red-600 bg-red-50" label="Promotions rejected" value={formatNumber(kpi.rejected)}
          note={kpi.topRejection ? `Top: ${kpi.topRejection.reason} (${kpi.topRejection.count})` : "none"} />
        <Kpi icon={AlertTriangle} tone="text-amber-600 bg-amber-50" label="Products at stockout risk" value={formatNumber(kpi.stockoutRiskProducts)} note={`< ${config.stockoutRiskCoverDays} days of cover in a city`} />
        <Kpi icon={Layers} tone="text-violet-600 bg-violet-50" label="Overstocked · need clearance" value={formatNumber(kpi.overstockedProducts)} note={`> ${config.overstockCoverDays} days of cover in a city`} />
        <Kpi icon={Boxes} tone="text-sky-600 bg-sky-50" label="Total inventory value" value={formatINRCompact(kpi.inventoryValue)} note="at cost price" />
        <Kpi icon={Percent} tone="text-indigo-600 bg-indigo-50" label="Average recommended discount" value={`${kpi.avgDiscount.toFixed(1)}%`} note="funded promotions" />
      </div>

      <DashboardCharts data={view.charts} />

      {/* ---------------------------------------------------------- tables */}
      <Card
        title="Recommended plan"
        subtitle={`${view.plan.length} funded promotions, best incremental profit first · ${formatINR(head.budgetUsed)} of budget`}
      >
        <PlanTable rows={view.plan} />
      </Card>

      <Card
        title="Rejected promotions"
        subtitle="What the engine refused to do, and why. Each is a promotion a naive sales forecast would have recommended."
        action={<span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700"><Wallet size={12} /> {view.rejected.length} rejected</span>}
      >
        <RejectedTable rows={view.rejected} />
      </Card>

      <SettingsPanel config={config} />
    </div>
  );
}

function Kpi({ icon: Icon, tone, label, value, note }: { icon: typeof Megaphone; tone: string; label: string; value: string; note: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        <span className={`rounded-lg p-1.5 ${tone}`}><Icon size={15} /></span>
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{value}</div>
      <div className="mt-0.5 text-[11px] leading-snug text-slate-500">{note}</div>
    </div>
  );
}
