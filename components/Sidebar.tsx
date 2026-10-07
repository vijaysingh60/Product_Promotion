"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, Database, FlaskConical, LayoutDashboard, ListChecks, Plane, Users } from "lucide-react";
import type { DataSource } from "@/types";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/recommendations", label: "Recommendations", icon: ListChecks },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/customers", label: "Segments", icon: Users },
  { href: "/simulator", label: "What-if Simulator", icon: FlaskConical },
];

export default function Sidebar({ source }: { source: DataSource }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-slate-900 p-4 text-slate-300 lg:flex">
        <div className="mb-7 flex items-center gap-2.5 px-2 pt-2">
          <span className="rounded-lg bg-indigo-500 p-1.5 text-white"><Plane size={18} /></span>
          <div>
            <div className="text-base font-semibold leading-tight text-white">PromoPilot</div>
            <div className="text-[11px] text-slate-400">Promotion &amp; Inventory Planner</div>
          </div>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive(href) ? "bg-indigo-600 text-white" : "hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon size={17} />
              {label}
            </Link>
          ))}
        </nav>
        <div
          title={source.kind === "mongodb" ? `Reading from MongoDB database "${source.database}"` : `Using the bundled demo data: ${source.reason}. Run "npm run seed" once MongoDB is reachable.`}
          className={`mt-auto flex items-start gap-2 rounded-lg p-3 text-xs leading-snug ${source.kind === "mongodb" ? "bg-emerald-900/40 text-emerald-200" : "bg-amber-900/40 text-amber-200"}`}
        >
          <Database size={14} className="mt-0.5 shrink-0" />
          <div>
            {source.kind === "mongodb" ? (
              <><div className="font-semibold">MongoDB</div><div className="opacity-80">database: {source.database}</div></>
            ) : (
              <><div className="font-semibold">Demo data</div><div className="opacity-80">MongoDB not in use: {source.reason}</div></>
            )}
          </div>
        </div>
        <div className="mt-3 rounded-lg bg-slate-800 p-3 text-xs leading-relaxed text-slate-400">
          Decisions are made on <span className="text-slate-200">incremental profit</span> inside hard price and stock rules.
          Demand, response and inventory models are deterministic stubs, ready to be replaced by trained models.
        </div>
      </aside>

      <header className="sticky top-0 z-20 bg-slate-900 lg:hidden">
        <div className="flex items-center gap-2 px-4 pt-3 text-sm font-semibold text-white"><Plane size={16} /> PromoPilot</div>
        <nav className="flex gap-1 overflow-x-auto px-3 py-2">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium ${
                isActive(href) ? "bg-indigo-600 text-white" : "text-slate-300"
              }`}
            >
              <Icon size={14} />
              {label}
            </Link>
          ))}
        </nav>
      </header>
    </>
  );
}
