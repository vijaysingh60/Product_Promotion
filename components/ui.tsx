import Link from "next/link";
import type { ReactNode } from "react";
import type { FundingStatus, RiskLevel, StockStatus, Verdict } from "@/types";

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 max-w-3xl text-sm text-slate-500">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function Card({ title, subtitle, children, className = "", action }: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {title && (
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

const TONES = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  amber: "bg-amber-50 text-amber-800 ring-amber-600/20",
  red: "bg-red-50 text-red-700 ring-red-600/20",
  blue: "bg-sky-50 text-sky-700 ring-sky-600/20",
  violet: "bg-violet-50 text-violet-700 ring-violet-600/20",
  slate: "bg-slate-100 text-slate-700 ring-slate-500/20",
};

export function Pill({ tone, children }: { tone: keyof typeof TONES; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TONES[tone]}`}>
      {children}
    </span>
  );
}

export const RiskBadge = ({ risk }: { risk: RiskLevel }) => (
  <Pill tone={risk === "Low" ? "green" : risk === "Medium" ? "amber" : "red"}>{risk}</Pill>
);

export const VerdictBadge = ({ verdict }: { verdict: Verdict }) => (
  <Pill tone={verdict === "PROMOTE" ? "green" : verdict === "PROMOTE ALTERNATIVE" ? "blue" : "red"}>{verdict}</Pill>
);

export const StatusBadge = ({ status }: { status: FundingStatus }) => (
  <Pill tone={status === "funded" ? "green" : status === "unfunded" ? "amber" : "red"}>
    {status === "funded" ? "In plan" : status === "unfunded" ? "Not funded" : "Rejected"}
  </Pill>
);

export const StockBadge = ({ status }: { status: StockStatus }) => (
  <Pill tone={status === "Healthy" ? "green" : status === "Low" ? "amber" : status === "Stockout risk" ? "red" : "violet"}>{status}</Pill>
);

export const ClearanceBadge = () => <Pill tone="violet">Clearance</Pill>;

export const th = "px-2.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap";
export const thRight = `${th} text-right`;
export const td = "px-2.5 py-2.5 text-sm text-slate-700 whitespace-nowrap";
export const tdRight = `${td} text-right tabular-nums`;
export const selectClass = "rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700";

/** Product name with its id; pass `href` to make it a link to the recommendation. */
export function ProductName({ name, id, href }: { name: string; id: string; href?: string }) {
  return (
    <>
      {href ? (
        <Link href={href} className="font-medium text-slate-900 underline-offset-2 hover:text-indigo-700 hover:underline">{name}</Link>
      ) : (
        <span className="font-medium text-slate-900">{name}</span>
      )}
      <span className="ml-1.5 text-xs text-slate-400">{id}</span>
    </>
  );
}

export function ShowMore({ remaining, onClick }: { remaining: number; onClick: () => void }) {
  return (
    <div className="border-t border-slate-100 p-3 text-center">
      <button onClick={onClick} className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
        Show more ({remaining} remaining)
      </button>
    </div>
  );
}

/** Horizontal bar used for factor scores and similar 0–100 values. */
export function MeterBar({ value, tone = "indigo" }: { value: number; tone?: "indigo" | "red" }) {
  return (
    <div className="h-2 rounded-full bg-slate-100">
      <div className={`h-2 rounded-full ${tone === "red" ? "bg-red-400" : "bg-indigo-500"}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}
