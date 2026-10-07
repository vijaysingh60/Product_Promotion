import Link from "next/link";
import { ArrowLeft, CircleCheck, FlaskConical, TriangleAlert } from "lucide-react";
import { formatINR, formatNumber } from "@/lib/calculations";
import type { PredictionSource, Recommendation } from "@/types";
import { Card, ModelStatus, RiskBadge, StatusBadge } from "./ui";

const BREAKDOWN = [
  { key: "affinity", label: "Customer affinity", max: 25, signal: "CUSTOMER" },
  { key: "demand", label: "Regional demand + predicted uplift", max: 25, signal: "DEMAND" },
  { key: "inventory", label: "Stock left vs reorder level", max: 20, signal: "INVENTORY" },
  { key: "margin", label: "Margin after discount", max: 15, signal: "PRODUCT + PROFIT" },
  { key: "history", label: "Past promotion performance", max: 15, signal: "PROMOTION" },
] as const;

export default function RecommendationDetails({ rec, source }: { rec: Recommendation; source: PredictionSource }) {
  const simulatorHref = `/simulator?${new URLSearchParams({
    product: rec.productId,
    segment: rec.segment,
    location: rec.location,
    discount: String(rec.discount),
  })}`;

  const facts = [
    { label: "Product", value: rec.productName },
    { label: "Customer Segment", value: rec.segment },
    { label: "Location", value: rec.location },
    { label: "Suggested Discount", value: `${rec.discount}%` },
    { label: "Promotion Score", value: `${rec.score}/100` },
    { label: "Predicted Demand", value: `${formatNumber(rec.predictedDemand)} units` },
    { label: "Inventory", value: `${formatNumber(rec.inventory)} units` },
    { label: "Risk", value: <RiskBadge risk={rec.risk} /> },
    { label: "Expected Revenue", value: formatINR(rec.expectedRevenue) },
    { label: "Expected Profit", value: formatINR(rec.expectedProfit) },
  ];

  return (
    <div className="space-y-6">
      <Link href="/recommendations" className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700">
        <ArrowLeft size={16} /> Back to recommendations
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {rec.productName} <span className="font-normal text-slate-400">→</span> {rec.segment}
            </h1>
            <StatusBadge status={rec.status} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {rec.productId} · {rec.category} · list price {formatINR(rec.price)}
          </p>
        </div>
        <Link
          href={simulatorHref}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          <FlaskConical size={16} /> Try in What-if Simulator
        </Link>
      </div>

      <Card>
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-slate-100 sm:grid-cols-3 lg:grid-cols-5">
          {facts.map((f) => (
            <div key={f.label} className="bg-white p-5">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{f.label}</dt>
              <dd className="mt-1.5 text-lg font-semibold text-slate-900">{f.value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card title="How demand was predicted">
        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <p className="text-sm text-slate-700">
            Baseline <strong>{formatNumber(rec.baselineDemand)} units</strong> × predicted uplift{" "}
            <strong>{rec.upliftPct >= 0 ? "+" : ""}{rec.upliftPct}%</strong> at a {rec.discount}% discount ={" "}
            <strong>{formatNumber(rec.predictedDemand)} units</strong>, leaving{" "}
            {formatNumber(Math.max(rec.inventory - rec.predictedDemand, 0))} in stock (reorder level{" "}
            {formatNumber(rec.reorderLevel)}).
          </p>
          <ModelStatus source={source} />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card
          title={rec.status === "Recommended" ? "Why this promotion is recommended" : "Key factors behind this score"}
        >
          <ul className="space-y-3 p-5">
            {rec.reasons.map((r) => (
              <li key={r} className="flex gap-3 text-sm text-slate-700">
                <CircleCheck size={18} className="mt-0.5 shrink-0 text-emerald-500" />
                {r}
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Possible risks">
          <ul className="space-y-3 p-5">
            {rec.risks.map((r) => (
              <li key={r} className="flex gap-3 text-sm text-slate-700">
                <TriangleAlert size={18} className="mt-0.5 shrink-0 text-amber-500" />
                {r}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="How the score is built" subtitle="Promotion score = sum of five signals, each capped. The weights are business rules, not learned.">
        <div className="space-y-4 p-5">
          {BREAKDOWN.map(({ key, label, max, signal }) => {
            const value = rec.breakdown[key];
            return (
              <div key={key}>
                <div className="mb-1 flex items-baseline justify-between text-sm">
                  <span className="font-medium text-slate-700">
                    {label} <span className="ml-1 text-[11px] font-semibold tracking-wide text-slate-400">{signal}</span>
                  </span>
                  <span className="tabular-nums text-slate-500">{value} / {max}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${(value / max) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
