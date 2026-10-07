import { Boxes, Megaphone, Package, TriangleAlert, Users } from "lucide-react";
import { formatNumber } from "@/lib/calculations";

export interface DashboardStats {
  totalProducts: number;
  totalCustomers: number;
  availableInventory: number;
  recommendedPromotions: number;
  totalPromotions: number;
  highRiskProducts: number;
}

export default function DashboardCards({ stats }: { stats: DashboardStats }) {
  const cards = [
    { label: "Total Products", value: stats.totalProducts, icon: Package, tone: "bg-indigo-50 text-indigo-600" },
    { label: "Total Customers", value: stats.totalCustomers, icon: Users, tone: "bg-sky-50 text-sky-600" },
    { label: "Available Inventory", value: stats.availableInventory, icon: Boxes, tone: "bg-teal-50 text-teal-600", note: "units in stock" },
    { label: "Recommended Promotions", value: stats.recommendedPromotions, icon: Megaphone, tone: "bg-emerald-50 text-emerald-600", note: `of ${formatNumber(stats.totalPromotions)} evaluated` },
    { label: "High Risk Products", value: stats.highRiskProducts, icon: TriangleAlert, tone: "bg-red-50 text-red-600", note: "critical stock in 3+ cities" },
  ];
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map(({ label, value, icon: Icon, tone, note }) => (
        <div key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">{label}</span>
            <span className={`rounded-lg p-2 ${tone}`}>
              <Icon size={18} />
            </span>
          </div>
          <div className="mt-3 text-3xl font-semibold tabular-nums text-slate-900">{formatNumber(value)}</div>
          {note && <div className="mt-1 text-xs text-slate-400">{note}</div>}
        </div>
      ))}
    </div>
  );
}
