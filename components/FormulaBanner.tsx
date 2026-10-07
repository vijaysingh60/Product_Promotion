// Communicates the core idea of the product: a recommendation is a combination of six signals.
const TERMS = [
  { label: "Customer", hint: "segment affinity" },
  { label: "Product", hint: "price & category" },
  { label: "Demand", hint: "regional forecast" },
  { label: "Inventory", hint: "stock cover" },
  { label: "Promotion", hint: "past campaigns" },
  { label: "Profit", hint: "margin after discount" },
];

export default function FormulaBanner() {
  return (
    <section className="rounded-xl bg-gradient-to-r from-slate-900 to-indigo-900 p-5 text-white shadow-sm">
      <p className="text-sm text-indigo-200">
        Not just a sales forecast — which product should we promote, to which segment, at what discount, while
        protecting inventory and profit?
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {TERMS.map((t, i) => (
          <div key={t.label} className="flex items-center gap-2">
            <div className="rounded-lg bg-white/10 px-3 py-2 ring-1 ring-white/15">
              <div className="text-xs font-bold uppercase tracking-wider">{t.label}</div>
              <div className="text-[11px] text-indigo-200">{t.hint}</div>
            </div>
            {i < TERMS.length - 1 && <span className="text-lg font-light text-indigo-300">+</span>}
          </div>
        ))}
        <span className="text-lg font-light text-indigo-300">=</span>
        <div className="rounded-lg bg-emerald-500 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white">
          Recommended promotion
        </div>
      </div>
    </section>
  );
}
