"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";

interface Msg {
  role: "user" | "bot";
  text: string;
  links?: { label: string; href: string }[];
}

const SUGGESTIONS = [
  "Will a shoes campaign work in Hyderabad?",
  "Which promotions should we run first?",
  "Why was Television rejected?",
  "Which products are low on stock?",
  "Which products need clearance?",
  "How much of the budget is used?",
];

/** Floating assistant in the bottom-right corner. Answers come from /api/chat (rule-based, live plan). */
export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "bot", text: "Hi! Ask me about promotions, stock or the budget — or tap a question below." },
  ]);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Block body on purpose: an effect must not return a value.
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, busy]);

  async function ask(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setMessages((m) => [...m, { role: "user", text: message }]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message }) });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { answer: string; links: Msg["links"] };
      setMessages((m) => [...m, { role: "bot", text: data.answer, links: data.links }]);
    } catch {
      setMessages((m) => [...m, { role: "bot", text: "Sorry, I couldn't reach the planner just now. Please try again." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div className="mb-3 flex h-[32rem] max-h-[80vh] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-slate-900 px-4 py-3 text-white">
            <div>
              <div className="text-sm font-semibold">PromoPilot assistant</div>
              <div className="text-[11px] text-slate-400">Answers from your live plan</div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close chat" className="rounded p-1 hover:bg-slate-700"><X size={16} /></button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-3">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div className={`max-w-[88%] whitespace-pre-line rounded-2xl px-3 py-2 text-[13px] leading-relaxed ${m.role === "user" ? "bg-indigo-600 text-white" : "border border-slate-200 bg-white text-slate-800"}`}>
                  {m.text}
                  {m.links && m.links.length > 0 && (
                    <div className="mt-2 flex flex-col gap-1 border-t border-slate-100 pt-2">
                      {m.links.map((l) => (
                        <Link key={l.href} href={l.href} className="text-xs font-medium text-indigo-600 hover:underline">{l.label} →</Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {busy && <div className="text-xs text-slate-400">Thinking…</div>}
            {messages.length <= 1 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => ask(s)} className="rounded-full border border-indigo-200 bg-white px-2.5 py-1 text-left text-xs text-indigo-700 hover:bg-indigo-50">{s}</button>
                ))}
              </div>
            )}
            <div ref={end} />
          </div>

          <form onSubmit={(e) => { e.preventDefault(); ask(input); }} className="flex items-center gap-2 border-t border-slate-200 bg-white p-2">
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about a product, city or stock…" maxLength={300} className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <button type="submit" disabled={busy || !input.trim()} aria-label="Send" className="rounded-lg bg-indigo-600 p-2 text-white enabled:hover:bg-indigo-700 disabled:opacity-40"><Send size={16} /></button>
          </form>
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close assistant" : "Open assistant"}
        className="ml-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700"
      >
        {open ? <X size={20} /> : <MessageCircle size={22} />}
      </button>
    </div>
  );
}
