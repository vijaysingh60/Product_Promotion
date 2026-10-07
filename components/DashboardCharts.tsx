"use client";

import { Bar, BarChart, Cell, CartesianGrid, LabelList, Legend, Pie, PieChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";
import { formatINR, formatINRCompact, formatNumber } from "@/lib/format";
import type { GroupPoint, ScatterPoint, StockDemandPoint, WaterfallStep } from "@/lib/analytics";
import type { RiskLevel } from "@/types";
import { Card } from "./ui";

const COLORS = { indigo: "#4f46e5", green: "#10b981", red: "#ef4444", amber: "#f59e0b", slate: "#475569", teal: "#14b8a6", sky: "#38bdf8" };
const RISK_COLOR: Record<RiskLevel, string> = { Low: COLORS.green, Medium: COLORS.amber, High: COLORS.red };
const grid = <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />;
const tick = { fontSize: 11, fill: "#64748b" };
const money = (v: unknown) => formatINR(Number(v));
const compact = (v: number) => formatINRCompact(v);

function Empty() {
  return <div className="flex h-full items-center justify-center text-sm text-slate-400">No promotions in the plan for these filters.</div>;
}

export interface ChartData {
  waterfall: { steps: WaterfallStep[]; axisMin: number; axisMax: number; ticks: number[] };
  byCity: GroupPoint[];
  bySegment: GroupPoint[];
  top: GroupPoint[];
  scatter: ScatterPoint[];
  stock: StockDemandPoint[];
  risk: { name: RiskLevel; value: number }[];
}

export default function DashboardCharts({ data }: { data: ChartData }) {
  const hasPlan = data.scatter.length > 0;
  const stepColor = (s: WaterfallStep) => (s.kind === "total" ? COLORS.slate : s.kind === "up" ? COLORS.green : COLORS.red);
  const riskTotal = data.risk.reduce((s, r) => s + r.value, 0);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-6">
      <Card className="xl:col-span-3" title="Profit bridge: baseline → plan" subtitle={`Axis starts at ${compact(data.waterfall.axisMin)} so the small steps are visible`}>
        <div className="h-72 p-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.waterfall.steps} margin={{ left: 8 }}>
              {grid}
              <XAxis dataKey="name" tick={{ ...tick, fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={58} />
              <YAxis tick={tick} domain={[data.waterfall.axisMin, data.waterfall.axisMax]} ticks={data.waterfall.ticks} tickFormatter={compact} allowDataOverflow />
              <Tooltip formatter={(_v, _n, item) => money((item.payload as WaterfallStep).delta)} />
              <Bar dataKey="base" stackId="w" fill="transparent" isAnimationActive={false} />
              <Bar dataKey="value" stackId="w" isAnimationActive={false} radius={[3, 3, 0, 0]}>
                {data.waterfall.steps.map((s) => <Cell key={s.name} fill={stepColor(s)} />)}
                {/* Label every bar so the thin steps (stockout loss, clearance) are still readable. */}
                <LabelList dataKey="label" position="top" fontSize={10} fill="#334155" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="xl:col-span-3" title="Discount vs incremental profit" subtitle="Each dot is a funded promotion · size = predicted units">
        <div className="h-72 p-3">
          {hasPlan ? (
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ left: 8, bottom: 16 }}>
                {grid}
                <XAxis type="number" dataKey="discount" name="Discount" unit="%" tick={tick} domain={[0, "auto"]} label={{ value: "Discount %", position: "insideBottom", offset: -8, fontSize: 11, fill: "#64748b" }} />
                <YAxis type="number" dataKey="incrementalProfit" name="Incremental profit" tick={tick} tickFormatter={compact} />
                <ZAxis type="number" dataKey="units" range={[30, 380]} name="Units" />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  content={({ payload }) => {
                    const p = payload?.[0]?.payload as ScatterPoint | undefined;
                    if (!p) return null;
                    return (
                      <div className="rounded-lg border border-slate-200 bg-white p-2 text-xs shadow">
                        <div className="font-semibold">{p.label}</div>
                        <div>{p.discount}% off · {formatNumber(p.units)} units · {p.risk} risk</div>
                        <div>Incremental profit {formatINR(p.incrementalProfit)}</div>
                      </div>
                    );
                  }}
                />
                {(["Low", "Medium", "High"] as RiskLevel[]).filter((r) => data.scatter.some((p) => p.risk === r)).map((r) => (
                  <Scatter key={r} name={`${r} risk`} data={data.scatter.filter((p) => p.risk === r)} fill={RISK_COLOR[r]} fillOpacity={0.65} isAnimationActive={false} />
                ))}
                <Legend verticalAlign="top" height={24} wrapperStyle={{ fontSize: 11 }} />
              </ScatterChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </div>
      </Card>

      <Card className="xl:col-span-2" title="Incremental profit by city">
        <div className="h-60 p-3">
          {hasPlan ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.byCity}>
                {grid}
                <XAxis dataKey="name" tick={tick} interval={0} />
                <YAxis tick={tick} tickFormatter={compact} />
                <Tooltip formatter={(v, _n, item) => [money(v), `${(item.payload as GroupPoint).promotions} promotions`]} />
                <Bar dataKey="incrementalProfit" fill={COLORS.indigo} radius={[3, 3, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </div>
      </Card>

      <Card className="xl:col-span-2" title="Incremental profit by segment">
        <div className="h-60 p-3">
          {hasPlan ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.bySegment}>
                {grid}
                <XAxis dataKey="name" tick={{ ...tick, fontSize: 10 }} interval={0} tickFormatter={(v: string) => v.replace(" Customers", "")} />
                <YAxis tick={tick} tickFormatter={compact} />
                <Tooltip formatter={(v, _n, item) => [money(v), `${(item.payload as GroupPoint).promotions} promotions`]} />
                <Bar dataKey="incrementalProfit" fill={COLORS.teal} radius={[3, 3, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </div>
      </Card>

      <Card className="xl:col-span-2" title="Top 5 products by incremental profit">
        <div className="h-60 p-3">
          {hasPlan ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.top} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" tick={tick} tickFormatter={compact} />
                <YAxis type="category" dataKey="name" tick={{ ...tick, fontSize: 10 }} width={110} />
                <Tooltip formatter={(v, _n, item) => [money(v), `${(item.payload as GroupPoint).promotions} promotions`]} />
                <Bar dataKey="incrementalProfit" fill={COLORS.sky} radius={[0, 3, 3, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </div>
      </Card>

      <Card className="xl:col-span-4" title="Stock vs predicted demand" subtitle="Per product, summed over the cities in view · red = demand is higher than stock in at least one city">
        <div className="h-72 p-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.stock}>
              {grid}
              <XAxis dataKey="name" tick={{ ...tick, fontSize: 9 }} interval={0} angle={-35} textAnchor="end" height={78} />
              <YAxis tick={tick} />
              <Tooltip
                content={({ payload, label }) => {
                  const p = payload?.[0]?.payload as StockDemandPoint | undefined;
                  if (!p) return null;
                  return (
                    <div className="rounded-lg border border-slate-200 bg-white p-2 text-xs shadow">
                      <div className="font-semibold">{label}</div>
                      <div>Stock {formatNumber(p.stock)} · predicted demand {formatNumber(p.demand)}</div>
                      {p.shortCities.length > 0 && <div className="text-red-600">Demand &gt; stock in {p.shortCities.join(", ")}</div>}
                    </div>
                  );
                }}
              />
              <Bar dataKey="stock" name="Stock" fill={COLORS.teal} radius={[3, 3, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="demand" name="Predicted demand" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                {data.stock.map((p) => <Cell key={p.name} fill={p.shortCities.length > 0 ? COLORS.red : COLORS.amber} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="xl:col-span-2" title="Risk of funded promotions" subtitle={`${riskTotal} promotions`}>
        <div className="h-72 p-3">
          {hasPlan ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.risk} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="80%" paddingAngle={2} isAnimationActive={false}>
                  {data.risk.map((r) => <Cell key={r.name} fill={RISK_COLOR[r.name]} />)}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </div>
      </Card>
    </div>
  );
}
