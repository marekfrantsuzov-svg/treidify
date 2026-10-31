"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { helpCategories } from "@/content/help";
import { Faq } from "./feature-page";

export function HelpCenter() {
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return helpCategories;
    return helpCategories
      .map((c) => ({ ...c, articles: c.articles.filter((a) => `${a.q} ${a.a}`.toLowerCase().includes(term)) }))
      .filter((c) => c.articles.length);
  }, [q]);
  const count = results.reduce((n, c) => n + c.articles.length, 0);
  return (
    <div>
      <label className="glass mx-auto flex h-14 max-w-2xl items-center gap-3 rounded-full px-5">
        <Search className="h-5 w-5 text-ink-3" />
        <span className="sr-only">Search help articles</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search: investor password, health score, trial…" className="h-full w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-3" />
      </label>
      <p className="mt-3 text-center text-sm text-ink-3" aria-live="polite">{q ? `${count} article${count === 1 ? "" : "s"} found` : `${count} articles`}</p>
      <div className="mt-10 grid gap-10">
        {results.map((c) => (
          <section key={c.id} id={c.id} className="scroll-mt-28">
            <h2 className="mb-4 text-xl font-semibold text-ink">{c.title}</h2>
            <Faq faqs={c.articles.map((a) => ({ q: a.q, a: a.a }))} />
          </section>
        ))}
        {count === 0 && <p className="text-center text-ink-2">No articles match. Try different words or <a className="text-accent hover:underline" href="/contact">contact us</a>.</p>}
      </div>
    </div>
  );
}
