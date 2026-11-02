"use client";

import { ChevronDown, NotebookPen } from "lucide-react";
import { useRouter } from "next/navigation";
import { Fragment, useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { deleteJournalScreenshot, saveJournalEntry, uploadJournalScreenshot } from "@/server/actions/journal";
import type { ActionResult } from "@/server/actions/settings";
import { Alert, Spinner, inputClass } from "@/components/auth/auth-ui";
import { Button } from "@/components/ui/button";

export interface JournalRow {
  id: string;
  closed: string;
  symbol: string;
  side: "buy" | "sell";
  volume: number;
  hold: string;
  session: string;
  net: string;
  up: boolean;
  entry: { notes: string; lessons: string; setupTags: string[]; mistakeTags: string[] } | null;
  /** Exact figures for the trade-detail view: how its net result is made up. */
  detail?: { opened: string; open: string; close: string; sl: string; tp: string; lots: string; gross: string; commission: string; swap: string; fees: string; net: string; position: string };
  screenshots?: string[];
}

function Detail({ d }: { d: NonNullable<JournalRow["detail"]> }) {
  const cell = (k: string, v: string) => <div><dt className="text-[11px] text-ink-3">{k}</dt><dd className="num text-[13px] font-medium text-ink">{v}</dd></div>;
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 px-4 pt-4 sm:grid-cols-4">
      {cell("Opened", d.opened)}{cell("Direction · lots", d.lots)}{cell("Entry", d.open)}{cell("Exit", d.close)}
      {cell("Stop loss", d.sl)}{cell("Take profit", d.tp)}{cell("Position ID", d.position)}{cell("Gross P&L", d.gross)}
      {cell("Commission", d.commission)}{cell("Swap", d.swap)}{cell("Fees", d.fees)}{cell("Net = gross + costs", d.net)}
    </dl>
  );
}

function Screenshots({ row, readOnly }: { row: JournalRow; readOnly: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const shots = row.screenshots ?? [];
  return (
    <div className="grid gap-2 px-4 pb-4">
      <p className="text-sm font-medium text-ink">Screenshots</p>
      <div className="flex flex-wrap gap-2">
        {shots.map((id) => (
          <div key={id} className="relative">
            <a href={`/api/journal/screenshot/${id}`} target="_blank" rel="noopener noreferrer"><img src={`/api/journal/screenshot/${id}`} alt="Trade screenshot" className="h-20 w-32 rounded-xl border border-line object-cover" loading="lazy" /></a>
            {!readOnly && <button type="button" disabled={pending} onClick={() => start(async () => { const x = await deleteJournalScreenshot(id); setErr(x.ok ? null : x.error); router.refresh(); })} className="absolute right-1 top-1 rounded-full bg-[var(--surface-strong)] px-2 text-[11px] font-semibold text-down shadow">Remove</button>}
          </div>
        ))}
        {!readOnly && shots.length < 4 && (
          <label className={cn("grid h-20 w-32 cursor-pointer place-items-center rounded-xl border border-dashed border-line text-center text-[12px] text-ink-3 hover:text-ink", pending && "opacity-50")}>
            {pending ? <Spinner /> : "Add image"}
            <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={pending} onChange={(e) => {
              const f = e.target.files?.[0]; if (!f) return;
              const fd = new FormData(); fd.set("tradeId", row.id); fd.set("file", f);
              start(async () => { const x = await uploadJournalScreenshot(fd); setErr(x.ok ? null : x.error); router.refresh(); });
              e.target.value = "";
            }} />
          </label>
        )}
      </div>
      {shots.length === 0 && readOnly && <p className="text-xs text-ink-3">No screenshots.</p>}
      {err && <p className="text-xs text-down" role="status">{err}</p>}
    </div>
  );
}

const splitTags = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

function Editor({ row, onDone, readOnly }: { row: JournalRow; onDone: () => void; readOnly: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [r, setR] = useState<ActionResult | null>(null);
  const [notes, setNotes] = useState(row.entry?.notes ?? "");
  const [lessons, setLessons] = useState(row.entry?.lessons ?? "");
  const [setup, setSetup] = useState(row.entry?.setupTags.join(", ") ?? "");
  const [mistakes, setMistakes] = useState(row.entry?.mistakeTags.join(", ") ?? "");
  const id = (k: string) => `${row.id}-${k}`;
  return (
    <>
    {row.detail && <Detail d={row.detail} />}
    <form
      className="grid gap-3 p-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const x = await saveJournalEntry({ tradeId: row.id, notes, lessons, setupTags: splitTags(setup), mistakeTags: splitTags(mistakes) });
          setR(x);
          if (x.ok) { router.refresh(); onDone(); }
        });
      }}
    >
      <label htmlFor={id("notes")} className="grid gap-1.5 text-sm font-medium text-ink sm:col-span-2">
        Notes
        <textarea id={id("notes")} value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={4000} disabled={readOnly} placeholder="Why you took the trade, how you managed it, what you saw." className={cn(inputClass, "h-auto py-2.5")} />
      </label>
      <label htmlFor={id("setup")} className="grid gap-1.5 text-sm font-medium text-ink">
        Setup tags
        <input id={id("setup")} value={setup} onChange={(e) => setSetup(e.target.value)} disabled={readOnly} placeholder="breakout, london open" className={inputClass} />
      </label>
      <label htmlFor={id("mistakes")} className="grid gap-1.5 text-sm font-medium text-ink">
        Mistake tags
        <input id={id("mistakes")} value={mistakes} onChange={(e) => setMistakes(e.target.value)} disabled={readOnly} placeholder="moved stop, early entry" className={inputClass} />
      </label>
      <label htmlFor={id("lessons")} className="grid gap-1.5 text-sm font-medium text-ink sm:col-span-2">
        Lesson
        <input id={id("lessons")} value={lessons} onChange={(e) => setLessons(e.target.value)} maxLength={2000} disabled={readOnly} placeholder="One thing to repeat or avoid." className={inputClass} />
      </label>
      {r && !r.ok && <div className="sm:col-span-2"><Alert>{r.error}</Alert></div>}
      <div className="flex items-center gap-2 sm:col-span-2">
        <Button type="submit" disabled={pending || readOnly}>{pending && <Spinner />}Save entry</Button>
        <Button type="button" variant="secondary" onClick={onDone}>Close</Button>
        <span className="text-xs text-ink-3">Separate tags with commas. The coach reads your tags alongside the numbers.</span>
      </div>
    </form>
    <Screenshots row={row} readOnly={readOnly} />
    </>
  );
}

export function JournalTable({ rows, readOnly = false }: { rows: JournalRow[]; readOnly?: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  if (!rows.length) return <p className="p-5 text-sm text-ink-3">No trades match these filters.</p>;
  return (
    <div className="overflow-x-auto">
      <table aria-label="Closed trades" className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-[0.08em] text-ink-3">
            {["Closed", "Instrument", "Side", "Lots", "Held", "Session", "Net", "Journal"].map((h, i) => <th key={h} className={cn("px-3 py-2.5 font-medium", (i === 3 || i === 6) && "text-right")}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const tags = [...(r.entry?.setupTags ?? []), ...(r.entry?.mistakeTags ?? [])];
            const isOpen = open === r.id;
            return (
              <Fragment key={r.id}>
                <tr className={cn("border-t border-line", isOpen && "bg-accent-soft/40")}>
                  <td className="num whitespace-nowrap px-3 py-2.5 text-ink-2">{r.closed}</td>
                  <td className="px-3 py-2.5 font-medium text-ink">{r.symbol}</td>
                  <td className={cn("px-3 py-2.5 font-medium", r.side === "buy" ? "text-up" : "text-down")}>{r.side === "buy" ? "Long" : "Short"}</td>
                  <td className="num px-3 py-2.5 text-right text-ink-2">{r.volume}</td>
                  <td className="num whitespace-nowrap px-3 py-2.5 text-ink-2">{r.hold}</td>
                  <td className="px-3 py-2.5 text-ink-2">{r.session}</td>
                  <td className={cn("num whitespace-nowrap px-3 py-2.5 text-right font-semibold", r.up ? "text-up" : "text-down")}>{r.net}</td>
                  <td className="px-3 py-2.5">
                    <button type="button" onClick={() => setOpen(isOpen ? null : r.id)} aria-expanded={isOpen} className="inline-flex max-w-[220px] items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium text-accent hover:bg-accent-soft">
                      <NotebookPen className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{tags.length ? tags.join(", ") : r.entry?.notes ? "Notes" : "Add notes"}</span>
                      <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition-transform", isOpen && "rotate-180")} />
                    </button>
                  </td>
                </tr>
                {isOpen && <tr><td colSpan={8} className="border-t border-line"><Editor row={r} onDone={() => setOpen(null)} readOnly={readOnly} /></td></tr>}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
