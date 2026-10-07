// Number formatting only. Safe to import anywhere.

const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

/** 148500 → "₹1,48,500", -4800 → "-₹4,800" */
export const formatINR = (n: number) => `${n < 0 ? "-" : ""}₹${inr.format(Math.abs(Math.round(n)))}`;
export const formatNumber = (n: number) => inr.format(Math.round(n));

/** 1250000 → "₹12.5L", 25000000 → "₹2.5Cr", small values stay exact. */
export function formatINRCompact(n: number): string {
  const sign = n < 0 ? "-" : "";
  const a = Math.abs(n);
  if (a >= 1e7) return `${sign}₹${(a / 1e7).toFixed(2)}Cr`;
  if (a >= 1e5) return `${sign}₹${(a / 1e5).toFixed(1)}L`;
  return formatINR(n);
}

export const formatPct = (n: number, digits = 1) => `${n.toFixed(digits)}%`;
