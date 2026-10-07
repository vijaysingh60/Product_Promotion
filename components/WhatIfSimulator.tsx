"use client";

import { useRef, useState } from "react";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CircleCheck } from "lucide-react";
import { DISCOUNT_OPTIONS, formatINR, formatNumber } from "@/lib/calculations";
import type { PromotionTarget, Simulation } from "@/types";
import { Card, ModelStatus, RiskBadge, selectClass, StatusBadge, td, th } from "./ui";

interface Props {
  products: { id: string; name: string; price: number }[];
  segments: string[];
  locations: string[];
  initialTarget: PromotionTarget;
  initialDiscount: number;
  /** Server-rendered result for the initial target, so the page opens with numbers already in place. */
  initial: Simulation;
}

export default function WhatIfSimulator({ products, segments, locations, initialTarget, initialDiscount, initial }: Props) {
  const [target, setTarget] = useState(initialTarget);
  const [discount, setDiscount] = useState(initialDiscount);
  const [sim, setSim] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latestRequest = useRef(0);

  // A new product / segment / location asks the server (→ ML service) for fresh predictions.
  // Moving the discount slider only switches between the six options already returned.
  async function changeTarget(patch: Partial<PromotionTarget>) {
    const next = { ...target, ...patch };
    const requestId = ++latestRequest.current;
    setTarget(next);
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ product: next.productId, segment: next.segment, location: next.location });
      const res = await fetch(`/api/simulate?${params}`);
      if (!res.ok) throw new Error(`Simulation request failed (${res.status})`);
      const data = (await res.json()) as Simulation;
      if (requestId === latestRequest.current) setSim(data);
    } catch (err) {
      if (requestId === latestRequest.current) setError(err instanceof Error ? err.message : "Simulation request failed");
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  }

  const { analysis } = sim;
  const current = analysis.options.find((o) => o.discount === discount) ?? analysis.best;
  const chartData = analysis.options.map((o) => ({
    discount: `${o.discount}%`,
    Revenue: o.expectedRevenue,
    Profit: o.expectedProfit,
    Demand: o.predictedDemand,
  }));
  const select = `${selectClass} w-full`;
  const label = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500";

  return (
    <div className="space-y-6">
      <Card title="Scenario">
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className={label}>Product</label>
            <select className={select} value={target.productId} onChange={(e) => changeTarget({ productId: e.target.value })}>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.id} ({formatINR(p.price)})</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Customer segment</label>
            <select className={select} value={target.segment} onChange={(e) => changeTarget({ segment: e.target.value })}>
              {segments.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Location</label>
            <select className={select} value={target.location} onChange={(e) => changeTarget({ location: e.target.value })}>
              {locations.map((l) => <option key={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Discount: <span className="text-indigo-600">{discount}%</span></label>
            <input
              type="range"
              min={DISCOUNT_OPTIONS[0]}
              max={DISCOUNT_OPTIONS[DISCOUNT_OPTIONS.length - 1]}
              step={5}
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
              className="mt-2 w-full accent-indigo-600"
            />
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>{DISCOUNT_OPTIONS[0]}%</span>
              <span>{DISCOUNT_OPTIONS[DISCOUNT_OPTIONS.length - 1]}%</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 px-5 py-3">
          <ModelStatus source={sim.source} />
          <span className="text-xs text-slate-500">
            {loading
              ? "Asking the model…"
              : `Baseline ${formatNumber(current.baselineDemand)} units × predicted uplift ${current.upliftPct >= 0 ? "+" : ""}${current.upliftPct}%`}
          </span>
        </div>
      </Card>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}. The numbers below are still from the previous scenario ({current.productName} · {current.segment} · {current.location}).
        </div>
      )}

      <div className={`space-y-6 transition-opacity ${loading ? "opacity-50" : ""}`}>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <Stat label="Predicted demand" value={`${formatNumber(current.predictedDemand)} units`} />
          <Stat label="Revenue" value={formatINR(current.expectedRevenue)} />
          <Stat label="Profit" value={formatINR(current.expectedProfit)} />
          <Stat
            label="Inventory impact"
            value={`${Math.round(current.stockUsage * 100)}% of stock`}
            note={`${formatNumber(Math.max(current.inventory - current.predictedDemand, 0))} of ${formatNumber(current.inventory)} units left · reorder at ${formatNumber(current.reorderLevel)}`}
          />
          <div className="col-span-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-1">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Risk</div>
            <div className="mt-2 flex flex-wrap items-center gap-2"><RiskBadge risk={current.risk} /><StatusBadge status={current.status} /></div>
            <div className="mt-2 text-xs text-slate-500">Promotion score {current.score}/100</div>
          </div>
        </div>

        <div className="flex gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <CircleCheck className="mt-0.5 shrink-0 text-emerald-600" />
          <div>
            <div className="text-lg font-semibold text-emerald-900">Recommended discount: {analysis.best.discount}%</div>
            <p className="mt-1 text-sm text-emerald-800">{analysis.explanation}</p>
            {discount !== analysis.best.discount && (
              <button
                onClick={() => setDiscount(analysis.best.discount)}
                className="mt-3 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
              >
                Apply {analysis.best.discount}%
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card title="Discount comparison">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50">
                  <tr>
                    <th className={th}>Discount</th>
                    <th className={th}>Uplift</th>
                    <th className={th}>Demand</th>
                    <th className={th}>Revenue</th>
                    <th className={th}>Profit</th>
                    <th className={th}>Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {analysis.options.map((o) => (
                    <tr
                      key={o.discount}
                      onClick={() => setDiscount(o.discount)}
                      className={`cursor-pointer hover:bg-slate-50 ${o.discount === discount ? "bg-indigo-50" : ""}`}
                    >
                      <td className={`${td} font-medium text-slate-900`}>
                        {o.discount}%
                        {o.discount === analysis.best.discount && (
                          <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">BEST</span>
                        )}
                      </td>
                      <td className={td}>{o.upliftPct >= 0 ? "+" : ""}{o.upliftPct}%</td>
                      <td className={td}>{formatNumber(o.predictedDemand)}</td>
                      <td className={td}>{formatINR(o.expectedRevenue)}</td>
                      <td className={td}>{formatINR(o.expectedProfit)}</td>
                      <td className={td}><RiskBadge risk={o.risk} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="Revenue, profit and demand by discount">
            <div className="h-72 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="discount" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="money" tick={{ fontSize: 12 }} tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`} />
                  <YAxis yAxisId="units" orientation="right" tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v, name) => (name === "Demand" ? `${v} units` : formatINR(Number(v)))} />
                  <Legend />
                  <Bar isAnimationActive={false} yAxisId="money" dataKey="Revenue" fill="#a5b4fc" radius={[4, 4, 0, 0]} />
                  <Bar isAnimationActive={false} yAxisId="money" dataKey="Profit" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  <Line isAnimationActive={false} yAxisId="units" dataKey="Demand" stroke="#f59e0b" strokeWidth={2} dot />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-xl font-semibold text-slate-900">{value}</div>
      {note && <div className="mt-1 text-xs text-slate-500">{note}</div>}
    </div>
  );
}
