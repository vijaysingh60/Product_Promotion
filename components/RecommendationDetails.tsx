import Link from "next/link";
import { ArrowLeft, ArrowRight, CircleCheck, FlaskConical, Info, TriangleAlert } from "lucide-react";
import { formatINR, formatNumber } from "@/lib/format";
import type { Recommendation } from "@/types";
import DiscountCurve, { type CurvePoint } from "./DiscountCurve";
import { Card, ClearanceBadge, MeterBar, RiskBadge, StatusBadge, StockBadge, VerdictBadge } from "./ui";

const FACTORS = [
  { key: "response", label: "Response", hint: "affinity + intent + past campaigns − fatigue" },
  { key: "demand", label: "Demand", hint: "lift the discount creates" },
  { key: "stockHealth", label: "Stock health", hint: "days of cover" },
  { key: "margin", label: "Margin", hint: "left after the discount" },
  { key: "fatigue", label: "Fatigue", hint: "response lost to message overload — lower is better" },
] as const;

export default function RecommendationDetails({ rec, curve, floorPct, costPerContact }: {
  rec: Recommendation;
  curve: CurvePoint[];
  floorPct: number;
  costPerContact: number;
}) {
  const o = rec.chosen;
  const simulatorHref = `/simulator?${new URLSearchParams({ product: rec.productId, segment: rec.segment, city: rec.city, ...(o ? { discount: String(o.discountPct) } : {}) })}`;
  const legalMax = rec.band.discounts[rec.band.discounts.length - 1] ?? 0;
  const rejected = rec.status === "rejected";

  return (
    <div className="space-y-5">
      <Link href="/recommendations" className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700">
        <ArrowLeft size={16} /> Back to recommendations
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight">
              {rec.productName} <span className="font-normal text-slate-400">→</span> {rec.segment} <span className="font-normal text-slate-400">·</span> {rec.city}
            </h1>
            <VerdictBadge verdict={rec.verdict} />
            <StatusBadge status={rec.status} />
            {rec.kind === "clearance" && <ClearanceBadge />}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {rec.productId} · {rec.category} · cost {formatINR(rec.band.costPrice)} · MRP {formatINR(rec.band.mrp)}
          </p>
        </div>
        <Link href={simulatorHref} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
          <FlaskConical size={16} /> Try in What-if Simulator
        </Link>
      </div>

      {/* ------------------------------------------- the decision, in words */}
      <div className={`rounded-xl border p-5 ${rec.verdict === "PROMOTE" ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
        <div className={`text-sm font-semibold ${rec.verdict === "PROMOTE" ? "text-emerald-900" : "text-red-900"}`}>
          {rec.rejection?.headline ?? rec.unfunded?.headline ?? (rec.kind === "clearance" ? "Clearance promotion recommended" : "Promotion recommended")}
        </div>
        <p className={`mt-1.5 text-sm leading-relaxed ${rec.verdict === "PROMOTE" ? "text-emerald-900" : "text-red-900"}`}>{rec.explanation}</p>
        {rec.notes.length > 0 && (
          <ul className="mt-3 space-y-1 text-xs text-amber-800">
            {rec.notes.map((n) => <li key={n}>⚠ {n}</li>)}
          </ul>
        )}
        {rec.alternative && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-white/70 px-3 py-2 text-sm text-sky-900">
            <ArrowRight size={15} className="shrink-0" />
            <span>
              Promote <strong>{rec.alternative.productName}</strong> to {rec.segment} in {rec.city} instead: {rec.alternative.discountPct}% off adds {formatINR(rec.alternative.incrementalProfit)}
              {rec.alternative.funded ? "." : " (not funded in the current budget)."}
            </span>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------- key facts */}
      {o && (
        <Card>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-slate-100 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: rejected ? "Best discount tried" : "Discount", value: `${o.discountPct}%`, sub: `${formatINR(o.offerPrice)} offer` },
              { label: "Audience", value: formatNumber(o.audience), sub: `of ${formatNumber(o.segmentSize)} (${Math.round(o.coverage * 100)}%)` },
              { label: "Predicted demand", value: `${formatNumber(o.promotedUnits)} units`, sub: `${formatNumber(o.baselineUnits)} baseline` },
              { label: "Units servable", value: `${formatNumber(o.unitsServable)}`, sub: `${o.unitsLost.toFixed(1)} lost to stockout` },
              { label: "Incremental profit", value: formatINR(o.incrementalProfit), sub: `ROI ${o.roi.toFixed(1)}× on ${formatINR(o.promoCost)}` },
              { label: "Risk", value: <RiskBadge risk={rec.risk} />, sub: `${Math.round(o.stockoutProbability * 100)}% stockout chance` },
            ].map((f) => (
              <div key={f.label} className="bg-white p-4">
                <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{f.label}</dt>
                <dd className="mt-1 text-lg font-semibold text-slate-900">{f.value}</dd>
                <div className="text-[11px] text-slate-500">{f.sub}</div>
              </div>
            ))}
          </dl>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
        <Card className="xl:col-span-3" title="Profit versus discount" subtitle="Incremental profit after promo cost. Shaded = illegal (offer would fall below CP + margin floor). Green dot = the engine's pick.">
          <DiscountCurve points={curve} legalMax={legalMax} optimum={o ? { discount: o.discountPct, incrementalProfit: o.incrementalProfit } : null} floorPct={floorPct} />
          <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
            <span>Cheapest legal offer: <strong className="text-slate-700">{formatINR(rec.band.minOfferPrice)}</strong> (CP + {floorPct}%)</span>
            <span>Deepest legal discount: <strong className="text-slate-700">{rec.band.maxDiscountPct > 0 ? rec.band.maxDiscountPct.toFixed(1) : "0.0"}%</strong></span>
            {rec.band.isEmpty && <span className="font-medium text-red-600">No legal discount exists for this product</span>}
          </div>
        </Card>

        <Card className="xl:col-span-2" title="Baseline vs promoted" subtitle="This segment in this city, next 30 days">
          {o ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-2 text-left font-semibold" />
                  <th className="px-3 py-2 text-right font-semibold">No promotion</th>
                  <th className="px-5 py-2 text-right font-semibold">Promoted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                <Row label="Units demanded" a={formatNumber(o.baselineUnits)} b={formatNumber(o.promotedUnits)} />
                <Row label="Revenue" a={formatINR(o.baselineRevenue)} b={formatINR(o.promotedRevenue)} />
                <Row label="Profit" a={formatINR(o.baselineProfit)} b={formatINR(o.promotedProfit)} />
                <Row label="Promo cost" a="—" b={formatINR(-o.promoCost)} />
                {o.clearanceValue > 0 && <Row label="Clearance value" a="—" b={formatINR(o.clearanceValue)} />}
                <tr className="bg-slate-50 font-semibold">
                  <td className="px-5 py-2.5">Net profit</td>
                  <td className="px-3 py-2.5 text-right">{formatINR(o.baselineProfit)}</td>
                  <td className="px-5 py-2.5 text-right">{formatINR(o.promotedProfit - o.promoCost + o.clearanceValue)}</td>
                </tr>
                <tr className={`font-semibold ${o.incrementalProfit >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                  <td className="px-5 py-2.5" colSpan={2}>Incremental profit</td>
                  <td className="px-5 py-2.5 text-right">{o.incrementalProfit >= 0 ? "+" : ""}{formatINR(o.incrementalProfit)}</td>
                </tr>
              </tbody>
            </table>
          ) : (
            <p className="p-5 text-sm text-slate-500">No discount could be evaluated: {rec.rejection?.headline.toLowerCase()}.</p>
          )}
          {o && (
            <div className="space-y-1 border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
              <div className="font-semibold text-slate-600">Where the incremental profit comes from</div>
              <Bridge label="Extra units sold" value={o.bridge.volume} />
              <Bridge label="Discount given to customers who would have bought anyway" value={o.bridge.giveaway} />
              <Bridge label="Lost to stockout" value={o.bridge.stockLoss} />
              <Bridge label={`Promo cost (₹${costPerContact} × ${formatNumber(o.audience)} contacts)`} value={o.bridge.promoCost} />
              {o.bridge.clearance > 0 && <Bridge label="Value of clearing excess stock" value={o.bridge.clearance} />}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card title="Factor breakdown" subtitle="0–100 each">
          <div className="space-y-4 p-5">
            {FACTORS.map(({ key, label, hint }) => (
              <div key={key}>
                <div className="mb-1 flex items-baseline justify-between text-sm">
                  <span className="font-medium text-slate-700">{label}</span>
                  <span className="tabular-nums text-slate-500">{rec.factors[key]}</span>
                </div>
                <MeterBar value={rec.factors[key]} tone={key === "fatigue" ? "red" : "indigo"} />
                <div className="mt-0.5 text-[11px] text-slate-400">{hint}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card title={rec.verdict === "PROMOTE" ? "Why recommended" : "What the numbers say"}>
          <ul className="space-y-3 p-5">
            {rec.reasons.map((r) => (
              <li key={r} className="flex gap-3 text-sm text-slate-700">
                {rec.verdict === "PROMOTE" ? <CircleCheck size={17} className="mt-0.5 shrink-0 text-emerald-500" /> : <Info size={17} className="mt-0.5 shrink-0 text-slate-400" />}{r}
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Risks">
          <ul className="space-y-3 p-5">
            {rec.risks.map((r) => (
              <li key={r} className="flex gap-3 text-sm text-slate-700">
                <TriangleAlert size={17} className="mt-0.5 shrink-0 text-amber-500" />{r}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="Stock position" subtitle={`${rec.city} stock only — never borrowed from another city`}>
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-b-xl bg-slate-100 sm:grid-cols-5">
          {[
            { label: "Stock", value: formatNumber(rec.stock) },
            { label: "Safety stock", value: formatNumber(rec.safetyStock) },
            { label: "Safe units", value: formatNumber(rec.safeUnits) },
            { label: "Days of cover", value: `${rec.daysOfCover.toFixed(0)} d` },
            { label: "Status", value: <StockBadge status={rec.stockStatus} /> },
          ].map((f) => (
            <div key={f.label} className="bg-white p-4">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{f.label}</dt>
              <dd className="mt-1 text-lg font-semibold text-slate-900">{f.value}</dd>
            </div>
          ))}
        </dl>
        <p className="flex gap-2 border-t border-slate-100 px-5 py-3 text-xs text-slate-500"><Info size={14} className="mt-0.5 shrink-0" />Expected buyers across all segments may use at most the stock-cap share of safe units; audiences are sized to stay inside it.</p>
      </Card>
    </div>
  );
}

function Row({ label, a, b }: { label: string; a: string; b: string }) {
  return (
    <tr>
      <td className="px-5 py-2 text-slate-600">{label}</td>
      <td className="px-3 py-2 text-right">{a}</td>
      <td className="px-5 py-2 text-right">{b}</td>
    </tr>
  );
}

function Bridge({ label, value }: { label: string; value: number }) {
  if (Math.abs(value) < 0.5) value = 0; // avoid "-₹0"
  return (
    <div className="flex justify-between gap-3">
      <span>{label}</span>
      <span className={`shrink-0 tabular-nums ${value < 0 ? "text-red-600" : "text-emerald-700"}`}>{value >= 0 ? "+" : ""}{formatINR(value)}</span>
    </div>
  );
}
