import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";
import { getData } from "@/lib/db";
import "./globals.css";

export const metadata: Metadata = {
  title: "PromoPilot — Promotion & Inventory Planner",
  description: "Decide what to promote, to whom, at what discount — by incremental profit, inside hard price and stock rules.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { source } = await getData();
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen lg:flex">
          <Sidebar source={source} />
          <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
