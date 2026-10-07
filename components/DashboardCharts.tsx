"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "./ui";
import { formatINR } from "@/lib/calculations";

export interface SegmentProfit {
  segment: string;
  profit: number;
}
export interface LocationStock {
  location: string;
  Healthy: number;
  "Low Stock": number;
  Critical: number;
}

export default function DashboardCharts({ segmentProfit, locationStock }: {
  segmentProfit: SegmentProfit[];
  locationStock: LocationStock[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Card title="Expected profit by customer segment" subtitle="Sum over all “Recommended” promotions">
        <div className="h-72 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={segmentProfit}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="segment" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => `₹${(v / 100000).toFixed(0)}L`} />
              <Tooltip formatter={(v) => formatINR(Number(v))} />
              <Bar isAnimationActive={false} dataKey="profit" name="Expected profit" fill="#4f46e5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card title="Stock health by location" subtitle="Number of products per status (stock vs reorder level)">
        <div className="h-72 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={locationStock}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="location" tick={{ fontSize: 11 }} interval={0} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar isAnimationActive={false} dataKey="Healthy" stackId="s" fill="#10b981" />
              <Bar isAnimationActive={false} dataKey="Low Stock" stackId="s" fill="#f59e0b" />
              <Bar isAnimationActive={false} dataKey="Critical" stackId="s" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
