"use client";

import { CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatINR, formatINRCompact } from "@/lib/format";

export interface CurvePoint {
  discount: number;
  incrementalProfit: number;
  legal: boolean;
}

interface Props {
  points: CurvePoint[];
  /** Deepest legal discount on the grid (0 when no discount is legal) */
  legalMax: number;
  /** Where the engine's pick sits */
  optimum: { discount: number; incrementalProfit: number } | null;
  /** Where the simulator slider sits */
  selected?: { discount: number; incrementalProfit: number } | null;
  floorPct: number;
  height?: number;
}

/** Incremental profit against discount. Discounts that would push the offer below CP + floor are shaded and marked illegal. */
export default function DiscountCurve({ points, legalMax, optimum, selected, floorPct, height = 288 }: Props) {
  const maxX = points[points.length - 1]?.discount ?? 40;
  const half = points.length > 1 ? (points[1].discount - points[0].discount) / 2 : 0;
  const blockedFrom = legalMax === 0 ? 0 : legalMax + half; // shade starts midway to the first illegal grid point
  return (
    <div style={{ height }} className="p-3">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={points} margin={{ left: 8, right: 12, bottom: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis type="number" dataKey="discount" domain={[0, maxX]} ticks={points.filter((p) => p.discount % 5 === 0).map((p) => p.discount)} tick={{ fontSize: 11, fill: "#64748b" }} unit="%" label={{ value: "Discount", position: "insideBottom", offset: -8, fontSize: 11, fill: "#64748b" }} />
          <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v: number) => formatINRCompact(v)} width={62} />
          <Tooltip
            content={({ payload }) => {
              const p = payload?.[0]?.payload as CurvePoint | undefined;
              if (!p) return null;
              return (
                <div className="rounded-lg border border-slate-200 bg-white p-2 text-xs shadow">
                  <div className="font-semibold">{p.discount}% off</div>
                  <div>Incremental profit {formatINR(p.incrementalProfit)}</div>
                  {!p.legal && <div className="text-red-600">Illegal: below CP + {floorPct}%</div>}
                </div>
              );
            }}
          />
          {blockedFrom < maxX && (
            <ReferenceArea x1={blockedFrom} x2={maxX} fill="#ef4444" fillOpacity={0.12} label={{ value: `Illegal: below CP + ${floorPct}%`, position: "insideTopRight", fontSize: 11, fill: "#b91c1c" }} />
          )}
          <ReferenceLine y={0} stroke="#94a3b8" />
          <Line type="monotone" dataKey="incrementalProfit" stroke="#4f46e5" strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />
          {optimum && <ReferenceDot x={optimum.discount} y={optimum.incrementalProfit} r={7} fill="#10b981" stroke="#fff" strokeWidth={2} label={{ value: "Best", position: "top", fontSize: 11, fill: "#047857" }} />}
          {selected && <ReferenceDot x={selected.discount} y={selected.incrementalProfit} r={5} fill="#f59e0b" stroke="#fff" strokeWidth={2} />}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
