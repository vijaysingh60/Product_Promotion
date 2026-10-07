"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, FlaskConical, LayoutDashboard, Megaphone, Users } from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/recommendations", label: "Recommendations", icon: Megaphone },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/simulator", label: "What-if Simulator", icon: FlaskConical },
];

export default function Sidebar() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-slate-900 p-4 text-slate-300 lg:flex">
        <div className="mb-8 px-2 pt-2">
          <div className="text-xs font-semibold uppercase tracking-widest text-indigo-400">Retail AI</div>
          <div className="mt-1 text-lg font-semibold leading-tight text-white">Promotion &amp; Inventory Planner</div>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive(href) ? "bg-indigo-600 text-white" : "hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto rounded-lg bg-slate-800 p-3 text-xs leading-relaxed text-slate-400">
          Sales uplift is predicted by an XGBoost model served locally (<span className="text-slate-200">ml/server.py</span>).
          Scores and risk are business rules on top of it.
        </div>
      </aside>

      {/* Mobile top nav */}
      <header className="sticky top-0 z-20 bg-slate-900 lg:hidden">
        <div className="px-4 pt-3 text-sm font-semibold text-white">Promotion &amp; Inventory Planner</div>
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
