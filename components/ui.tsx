import type { ReactNode } from "react";
import { RECOMMEND_SCORE, REVIEW_SCORE } from "@/lib/calculations";
import type { PredictionSource, RecommendationStatus, RiskLevel, StockStatus } from "@/types";

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 max-w-3xl text-sm text-slate-500">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function Card({ title, subtitle, children, className = "" }: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {title && (
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

const TONES = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  amber: "bg-amber-50 text-amber-700 ring-amber-600/20",
  red: "bg-red-50 text-red-700 ring-red-600/20",
};

function Pill({ tone, children }: { tone: keyof typeof TONES; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${TONES[tone]}`}>
      {children}
    </span>
  );
}

export const RiskBadge = ({ risk }: { risk: RiskLevel }) => (
  <Pill tone={risk === "Low" ? "green" : risk === "Medium" ? "amber" : "red"}>{risk}</Pill>
);

export const StatusBadge = ({ status }: { status: RecommendationStatus }) => (
  <Pill tone={status === "Recommended" ? "green" : status === "Review" ? "amber" : "red"}>{status}</Pill>
);

export const StockBadge = ({ status }: { status: StockStatus }) => (
  <Pill tone={status === "Healthy" ? "green" : status === "Low Stock" ? "amber" : "red"}>{status}</Pill>
);

/** Score with a bar coloured by the same cut-offs the engine uses for the recommendation status. */
export function ScoreBar({ score }: { score: number }) {
  const color = score >= RECOMMEND_SCORE ? "bg-emerald-500" : score >= REVIEW_SCORE ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <span className="w-7 text-right text-sm font-semibold tabular-nums text-slate-900">{score}</span>
      <div className="h-1.5 w-16 rounded-full bg-slate-100">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

/** Shows whether the numbers on screen came from the ML model or the mock fallback. */
export function ModelStatus({ source }: { source: PredictionSource }) {
  if (source.kind === "ml") {
    const { name, r2, mae } = source.model;
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        {name} · live · R² {r2.toFixed(2)} · MAE {mae.toFixed(1)} pts
      </div>
    );
  }
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800">
      <span className="h-2 w-2 rounded-full bg-amber-500" />
      Mock uplift formula · ML service offline — start it with <code className="font-mono">npm run ml:serve</code>
    </div>
  );
}

/** Product name with its ID (several products in the dataset share a name). */
export function ProductName({ name, id }: { name: string; id: string }) {
  return (
    <>
      <span className="font-medium text-slate-900">{name}</span>
      <span className="ml-2 text-xs text-slate-400">{id}</span>
    </>
  );
}

export const th = "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap";
export const td = "px-4 py-3 text-sm text-slate-700 whitespace-nowrap";
export const selectClass = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700";
