"use client";

import { useMemo, useState } from "react";
import { CircleCheck, Lock } from "lucide-react";
import { discountCurve, evaluateCandidate } from "@/lib/decisionEngine";
import { formatINR, formatNumber } from "@/lib/format";
import type { City, DiscountOption, EngineConfig, Segment } from "@/types";
import DiscountCurve from "./DiscountCurve";
import { Card, ClearanceBadge, RiskBadge, selectClass, StockBadge } from "./ui";

const SLIDER_MAX = 40;

interface Props {
  config: EngineConfig;
  products: { id: string; name: string; mrp: number }[];
  segments: Segment[];
  cities: City[];
  initial: { productId: string; segment: Segment; city: City; discount: number | null };
}

/** Everything runs in the browser against the same pure engine the plan uses. */
export default function WhatIfSimulator({ config, products, segments, cities, initial }: Props) {
  const [productId, setProductId] = useState(initial.productId);
  const [segment, setSegment] = useState(initial.segment);
  const [city, setCity] = useState(initial.city);
  const [picked, setPicked] = useState<number | null>(initial.discount);

  const key = useMemo(() => ({ productId, segment, city }), [productId, segment, city]);
  const rec = useMemo(() => evaluateCandidate(key, config), [key, config]);
  const curve = useMemo(() => discountCurve(key, config, undefined, SLIDER_MAX), [key, config]);

  const { band } = rec;
  const legalMax = band.discounts[band.discounts.length - 1] ?? 0;
  const best = rec.chosen;
  // Clamp: whatever was picked, the slider can never sit outside the legal band.
  const discount = band.isEmpty ? 0 : Math.min(legalMax, picked ?? best?.discountPct ?? Math.round(legalMax / 2 / config.discountStep) * config.discountStep);
  const at: DiscountOption | undefined = curve.find((o) => Math.abs(o.discountPct - discount) < 1e-6);

  const step = config.discountStep;
  const scenarios = useMemo(() => {
    if (band.isEmpty) return [];
    const low = Math.max(step, Math.round((legalMax * 0.4) / step) * step);
    const picks = [low, best?.discountPct ?? Math.round(legalMax / 2 / step) * step, legalMax];
    const unique = [...new Set(picks.map((d) => Math.min(d, legalMax)))].sort((a, b) => a - b);
    return unique.map((d, i) => ({
      label: d === legalMax && unique.length > 1 ? "Aggressive" : d === best?.discountPct ? "Engine's pick" : i === 0 ? "Conservative" : "Moderate",
      option: curve.find((o) => Math.abs(o.discountPct - d) < 1e-6)!,
    }));
  }, [band.isEmpty, legalMax, best, curve, step]);

  const select = `${selectClass} w-full`;
  const label = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500";
  const legalPct = (legalMax / SLIDER_MAX) * 100;
  const blockedTip = band.isEmpty
    ? `No profitable discount available: the offer would drop below ${formatINR(band.minOfferPrice)} (cost ${formatINR(band.costPrice)} + ${config.marginFloorPct}%) even at 0% off.`
    : `Blocked: beyond ${legalMax}% the offer would drop below ${formatINR(band.minOfferPrice)} (cost ${formatINR(band.costPrice)} + ${config.marginFloorPct}% floor).`;

  return (
    <div className="space-y-5">
      <Card title="Scenario">
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className={label}>Product</label>
            <select className={select} value={productId} onChange={(e) => { setProductId(e.target.value); setPicked(null); }}>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name} · MRP {formatINR(p.mrp)}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Customer segment</label>
            <select className={select} value={segment} onChange={(e) => { setSegment(e.target.value as Segment); setPicked(null); }}>
              {segments.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>City</label>
            <select className={select} value={city} onChange={(e) => { setCity(e.target.value as City); setPicked(null); }}>
              {cities.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Discount: <span className="text-indigo-600">{band.isEmpty ? "none available" : `${discount}%`}</span></label>
            <div className="mt-2 flex h-6 w-full items-center">
              <input
                type="range"
                aria-label="Discount percentage, limited to the legal band"
                min={0}
                max={band.isEmpty ? step : legalMax}
                step={step}
                value={discount}
                disabled={band.isEmpty}
                onChange={(e) => setPicked(Math.min(legalMax, Number(e.target.value)))}
                className="m-0 accent-indigo-600 disabled:opacity-40"
                style={{ width: band.isEmpty ? "0%" : `${legalPct}%` }}
              />
              <div
                title={blockedTip}
                className="flex h-3 flex-1 cursor-not-allowed items-center justify-center rounded-r bg-[repeating-linear-gradient(135deg,#e2e8f0,#e2e8f0_4px,#f1f5f9_4px,#f1f5f9_8px)]"
                style={band.isEmpty ? { borderRadius: 4 } : undefined}
              >
                <Lock size={10} className="text-slate-400" />
              </div>
            </div>
            <div className="mt-1 flex justify-between text-[11px] text-slate-400">
              <span>0%</span>
              <span>{band.isEmpty ? "all blocked" : `${legalMax}% max legal`}</span>
              <span>{SLIDER_MAX}%</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
          <span>Legal band: offer between <strong className="text-slate-700">{formatINR(band.minOfferPrice)}</strong> (CP + {config.marginFloorPct}%) and <strong className="text-slate-700">{formatINR(band.mrp)}</strong> (MRP)</span>
          <span>Stock in {city}: <strong className="text-slate-700">{formatNumber(rec.stock)}</strong> ({rec.daysOfCover.toFixed(0)} days) <StockBadge status={rec.stockStatus} /></span>
          {rec.kind === "clearance" && <ClearanceBadge />}
        </div>
      </Card>

      {band.isEmpty ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-900">
          <div className="font-semibold">{rec.rejection?.headline}</div>
          <p className="mt-1">{rec.rejection?.detail}</p>
        </div>
      ) : (
        <>
          {at && !at.viable && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <strong>Protect stock.</strong> At this discount no audience of at least {config.minAudience} customers can be served without breaking the safe-stock cap, so nothing is promoted.
            </div>
          )}

          {at?.viable && (
            <p className="-mb-2 text-xs text-slate-500">
              {at.limits.stockCapped
                ? `Stock-capped: the audience is sized so expected buyers stay within ${config.stockCapPct}% of safe units, so a deeper discount reaches fewer customers (${formatNumber(at.audience)} of ${formatNumber(at.segmentSize)}). `
                : `Audience: all ${formatNumber(at.segmentSize)} customers in the segment — stock is not a limit here. `}
              This is a standalone view of this one promotion; the plan also accounts for other campaigns, so its pick can differ.
            </p>
          )}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <Stat label="Predicted demand" value={at ? `${formatNumber(at.promotedUnits)} units` : "—"} note={at ? `${formatNumber(at.baselineUnits)} baseline · audience ${formatNumber(at.audience)}` : ""} />
            <Stat label="Units servable" value={at ? formatNumber(at.unitsServable) : "—"} note={at ? `${at.unitsLost.toFixed(1)} lost to stockout (${Math.round(at.stockoutProbability * 100)}% chance)` : ""} />
            <Stat label="Revenue" value={at ? formatINR(at.promotedRevenue) : "—"} note={at ? `baseline ${formatINR(at.baselineRevenue)}` : ""} />
            <Stat label="Profit" value={at ? formatINR(at.promotedProfit) : "—"} note={at ? `baseline ${formatINR(at.baselineProfit)}` : ""} />
            <Stat
              label="Incremental profit"
              value={at ? formatINR(at.incrementalProfit) : "—"}
              note={at ? `after ${formatINR(at.promoCost)} promo cost` : ""}
              tone={at && at.incrementalProfit < 0 ? "bad" : "good"}
              big
            />
            <Stat label="Remaining stock" value={at ? formatNumber(at.remainingStock) : "—"} note={at ? `of ${formatNumber(rec.stock)} · ${formatNumber(rec.safetyStock)} safety` : ""} />
            <Stat label="Days of cover after" value={at ? `${at.daysOfCoverAfter.toFixed(0)} days` : "—"} note={`${rec.daysOfCover.toFixed(0)} days today`} />
            <div className="col-span-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-1">
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Risk</div>
              <div className="mt-2">{at ? <RiskBadge risk={at.risk} /> : "—"}</div>
              <div className="mt-1.5 text-[11px] text-slate-500">margin {at ? at.marginAtOfferPct.toFixed(1) : "—"}% at offer</div>
            </div>
            <div className="col-span-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
              {best ? (
                <div className="flex gap-3">
                  <CircleCheck className="mt-0.5 shrink-0 text-emerald-600" size={20} />
                  <div>
                    <div className="text-sm font-semibold text-emerald-800">Optimum: {best.discountPct}% · {formatINR(best.incrementalProfit)}</div>
                    <p className="mt-0.5 text-xs text-slate-500">{rec.verdict === "PROMOTE" ? "Best incremental profit, penalised for stockout risk." : rec.rejection?.headline}</p>
                    {discount !== best.discountPct && <button onClick={() => setPicked(best.discountPct)} className="mt-1.5 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700">Jump to {best.discountPct}%</button>}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-red-700">{rec.rejection?.headline ?? "No viable discount"}</div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
            <Card className="xl:col-span-3" title="Profit versus discount" subtitle="Incremental profit after promo cost · orange = slider · green = optimum · shaded = illegal">
              <DiscountCurve
                points={curve.map((o) => ({ discount: o.discountPct, incrementalProfit: Math.round(o.incrementalProfit), legal: o.legal }))}
                legalMax={legalMax}
                optimum={best ? { discount: best.discountPct, incrementalProfit: best.incrementalProfit } : null}
                selected={at ? { discount: at.discountPct, incrementalProfit: at.incrementalProfit } : null}
                floorPct={config.marginFloorPct}
              />
            </Card>

            <Card className="xl:col-span-2" title="Three scenarios side by side">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-2 text-left font-semibold" />
                      {scenarios.map((s) => (
                        <th key={s.label} className="px-3 py-2 text-right font-semibold">
                          {s.label}<div className="text-sm normal-case text-slate-900">{s.option.discountPct}%</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 tabular-nums">
                    {([
                      ["Audience", (o: DiscountOption) => formatNumber(o.audience)],
                      ["Predicted demand", (o: DiscountOption) => formatNumber(o.promotedUnits)],
                      ["Lost to stockout", (o: DiscountOption) => o.unitsLost.toFixed(1)],
                      ["Revenue", (o: DiscountOption) => formatINR(o.promotedRevenue)],
                      ["Profit", (o: DiscountOption) => formatINR(o.promotedProfit)],
                      ["Incremental profit", (o: DiscountOption) => formatINR(o.incrementalProfit)],
                    ] as [string, (o: DiscountOption) => string][]).map(([name, f]) => (
                      <tr key={name} className={name === "Incremental profit" ? "bg-slate-50 font-semibold" : ""}>
                        <td className="px-4 py-2 text-slate-600">{name}</td>
                        {scenarios.map((s) => <td key={s.label} className={`px-3 py-2 text-right ${name === "Incremental profit" && s.option.incrementalProfit < 0 ? "text-red-600" : ""}`}>{f(s.option)}</td>)}
                      </tr>
                    ))}
                    <tr>
                      <td className="px-4 py-2 text-slate-600">Risk</td>
                      {scenarios.map((s) => <td key={s.label} className="px-3 py-2 text-right"><RiskBadge risk={s.option.risk} /></td>)}
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, note, tone, big }: { label: string; value: string; note?: string; tone?: "good" | "bad"; big?: boolean }) {
  return (
    <div className={`rounded-xl border bg-white p-4 shadow-sm ${big ? "border-emerald-300 ring-1 ring-emerald-200" : "border-slate-200"}`}>
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1.5 font-semibold tabular-nums ${big ? "text-2xl" : "text-xl"} ${tone === "bad" ? "text-red-600" : "text-slate-900"}`}>{value}</div>
      {note && <div className="mt-0.5 text-[11px] leading-snug text-slate-500">{note}</div>}
    </div>
  );
}
