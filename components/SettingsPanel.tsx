"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RotateCcw, SlidersHorizontal } from "lucide-react";
import { CONFIG_COOKIE, DEFAULT_CONFIG, TUNABLE } from "@/lib/config";
import type { EngineConfig } from "@/types";

type Tunable = (typeof TUNABLE)[number]["key"];

/** The four business rules that drive the plan. Saved in a cookie so every page uses the same values. */
export default function SettingsPanel({ config }: { config: EngineConfig }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Record<Tunable, number>>(() => Object.fromEntries(TUNABLE.map((t) => [t.key, config[t.key]])) as Record<Tunable, number>);

  const dirty = TUNABLE.some((t) => draft[t.key] !== config[t.key]);
  const valid = TUNABLE.every((t) => Number.isFinite(draft[t.key]) && draft[t.key] >= t.min && draft[t.key] <= t.max);

  function save(values: Record<Tunable, number>) {
    document.cookie = `${CONFIG_COOKIE}=${encodeURIComponent(JSON.stringify(values))}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }
  function reset() {
    const defaults = Object.fromEntries(TUNABLE.map((t) => [t.key, DEFAULT_CONFIG[t.key]])) as Record<Tunable, number>;
    setDraft(defaults);
    save(defaults);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
        <SlidersHorizontal size={15} /> Assumptions
        <span className="text-xs font-normal text-slate-500">Change one and the whole plan recomputes.</span>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {TUNABLE.map((t) => {
          const bad = !(Number.isFinite(draft[t.key]) && draft[t.key] >= t.min && draft[t.key] <= t.max);
          return (
            <label key={t.key} className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t.label}</span>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="number"
                  value={Number.isFinite(draft[t.key]) ? draft[t.key] : ""}
                  min={t.min}
                  max={t.max}
                  step={t.step}
                  onChange={(e) => setDraft({ ...draft, [t.key]: e.target.value === "" ? NaN : Number(e.target.value) })}
                  className={`w-full rounded-lg border px-2.5 py-1.5 text-sm tabular-nums ${bad ? "border-red-400" : "border-slate-300"}`}
                />
              </div>
              <span className="text-[11px] text-slate-400">{t.unit}</span>
            </label>
          );
        })}
        <div className="col-span-2 flex items-end gap-2 lg:col-span-1">
          <button
            onClick={() => save(draft)}
            disabled={!dirty || !valid}
            className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white enabled:hover:bg-indigo-700 disabled:opacity-40"
          >
            Apply
          </button>
          <button onClick={reset} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
            <RotateCcw size={13} /> Defaults
          </button>
        </div>
      </div>
    </div>
  );
}
