"use client";

import { Check, ChevronDown, Search, Star } from "lucide-react";
import { createContext, useContext, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES, INSTRUMENTS, searchInstruments, type AssetCategory } from "@/lib/markets/registry";
import type { CatalogItem } from "@/server/market/catalog";
import { setDeskInstrument, toggleFavorite } from "@/server/actions/markets";
import { AssetMark } from "@/components/ui/flags";
import { Modal } from "@/components/intel/modal";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";

const COVERAGE: Record<CatalogItem["coverage"], { label: string; cls: string } | null> = {
  verified: { label: "Live data", cls: "ip-cov is-ok" },
  computed: { label: "Computed", cls: "ip-cov is-ok" },
  unchecked: { label: "Not yet verified", cls: "ip-cov is-wait" },
  sample: { label: "Sample", cls: "ip-cov is-wait" },
  unavailable: null,
};

type Tab = "all" | "fav" | AssetCategory;

/** Searchable instrument list with categories and favourites. Pure UI: the caller decides what picking does. */
export function InstrumentPicker({ open, onClose, title, subtitle, catalog, current, taken = [], favorites, onPick, onToggleFavorite }: {
  open: boolean; onClose: () => void; title: string; subtitle?: React.ReactNode;
  catalog: CatalogItem[]; current: string | null; taken?: string[]; favorites: string[];
  onPick: (symbol: string) => void; onToggleFavorite?: (symbol: string) => void;
}) {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const input = useRef<HTMLInputElement>(null);
  const bySym = useMemo(() => new Map(catalog.map((c) => [c.symbol, c])), [catalog]);
  const results = useMemo(() => {
    const defs = catalog.map((c) => INSTRUMENTS[c.symbol]!).filter(Boolean);
    let list = searchInstruments(q, defs).map((d) => bySym.get(d.symbol)!);
    if (tab === "fav") list = list.filter((c) => favorites.includes(c.symbol));
    else if (tab !== "all") list = list.filter((c) => c.category === tab);
    return list;
  }, [q, tab, catalog, bySym, favorites]);
  const tabs: { id: Tab; label: string }[] = [{ id: "all", label: "All" }, { id: "fav", label: "Favorites" }, ...CATEGORIES.filter((c) => catalog.some((x) => x.category === c.id))];

  return (
    <Modal open={open} onClose={onClose} title={title} subtitle={subtitle} className="sm:max-w-2xl">
      <label className="ip-search">
        <Search aria-hidden className="h-4 w-4 shrink-0 text-ink-3" />
        <input ref={input} autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search EURUSD, Nasdaq, Bitcoin, oil…" aria-label="Search instruments"
          onKeyDown={(e) => { if (e.key === "Enter" && results[0]) onPick(results[0].symbol); }} className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-3" />
      </label>
      <div role="tablist" aria-label="Asset category" className="ip-tabs">
        {tabs.map((t) => <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={cn("ip-tab", tab === t.id && "is-on")}>{t.id === "fav" && <Star aria-hidden className="h-3.5 w-3.5" />}{t.label}</button>)}
      </div>
      <ul role="listbox" aria-label="Instruments" className="ip-list">
        {results.length === 0 && <li className="px-2 py-6 text-center text-[13px] text-ink-3">{tab === "fav" ? "No favorites yet. Tap the star next to an instrument to add it." : "No supported instrument matches that search."}</li>}
        {results.map((c) => {
          const cov = COVERAGE[c.coverage];
          const fav = favorites.includes(c.symbol);
          const isCur = c.symbol === current;
          const onDesk = !isCur && taken.includes(c.symbol);
          return (
            <li key={c.symbol} role="option" aria-selected={isCur} className={cn("ip-row", isCur && "is-current")}>
              <button type="button" onClick={() => onPick(c.symbol)} className="ip-pick">
                <AssetMark symbol={c.symbol} size={30} />
                <span className="min-w-0 flex-1 text-left leading-tight">
                  <span className="flex items-center gap-1.5"><b className="text-[14px] font-semibold text-ink">{c.symbol}</b>{isCur && <Check aria-label="Current" className="h-3.5 w-3.5 text-accent" />}{onDesk && <span className="ip-tag">On desk · swaps</span>}</span>
                  <span className="block truncate text-[12px] text-ink-3">{c.name}</span>
                </span>
                <span className="hidden text-right text-[11px] leading-tight text-ink-3 sm:block">{CATEGORIES.find((x) => x.id === c.category)?.label}<br />{c.unit === "pip" ? "Pip" : "Point"} {c.unitSize}</span>
                {cov && <span className={cov.cls}>{cov.label}</span>}
              </button>
              {onToggleFavorite && (
                <button type="button" onClick={() => onToggleFavorite(c.symbol)} aria-pressed={fav} aria-label={fav ? `Remove ${c.symbol} from favorites` : `Add ${c.symbol} to favorites`} className={cn("ip-star", fav && "is-on")}>
                  <Star className="h-4 w-4" fill={fav ? "currentColor" : "none"} />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}

/* ── Macro Desk slots ─────────────────────────────────────────────────────────────────────────────────────────── */

interface SlotCtx { slot: number; symbol: string; pending: boolean; openPicker: () => void }
const Ctx = createContext<SlotCtx | null>(null);

/**
 * One Macro Desk card slot. Wraps the server-rendered card; the instrument name inside it (SlotTrigger) opens the
 * picker. Picking saves the choice to the account and re-renders the desk with the new instrument's own data.
 */
export function DeskSlot({ slot, symbol, desk, catalog, favorites: initialFav, children }: {
  slot: number; symbol: string; desk: string[]; catalog: CatalogItem[]; favorites: string[]; children: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [favorites, setFavorites] = useState(initialFav);
  const [pending, start] = useTransition();
  const pick = (s: string) => {
    setOpen(false);
    if (s === symbol) return;
    start(async () => {
      const r = await setDeskInstrument({ slot, symbol: s });
      if (!r.ok) { toast(r.error, "warn"); return; }
      router.refresh();
    });
  };
  const fav = (s: string) => {
    setFavorites((f) => (f.includes(s) ? f.filter((x) => x !== s) : [...f, s]));
    void toggleFavorite(s).then((r) => { if (r.ok) setFavorites(r.favorites); else toast(r.error, "warn"); });
  };
  return (
    <Ctx.Provider value={{ slot, symbol, pending, openPicker: () => setOpen(true) }}>
      <div className={cn("relative h-full transition-opacity duration-300", pending && "pointer-events-none opacity-60")} aria-busy={pending}>
        {children}
        {pending && <div className="ip-loading" role="status"><span className="ip-spinner" aria-hidden />Loading {INSTRUMENTS[symbol]?.short ?? "instrument"} replacement…</div>}
      </div>
      <InstrumentPicker open={open} onClose={() => setOpen(false)} title={`Card ${slot + 1} instrument`} subtitle="Pick any supported market. Your choice is saved to your account."
        catalog={catalog} current={symbol} taken={desk} favorites={favorites} onPick={pick} onToggleFavorite={fav} />
    </Ctx.Provider>
  );
}

/** The card's instrument name as a button. Falls back to plain text outside a DeskSlot. */
export function SlotTrigger({ id, name, sub }: { id: string; name: string; sub: string }) {
  const c = useContext(Ctx);
  if (!c) return <div className="min-w-0 flex-1"><h3 id={id} className="truncate text-[16.5px] font-semibold tracking-[-0.015em] text-ink">{name}</h3><p className="text-[12px] text-ink-3">{sub}</p></div>;
  return (
    <button type="button" onClick={c.openPicker} className="ip-trigger min-w-0 flex-1 text-left" aria-haspopup="dialog" aria-label={`${name} (${sub}). Change instrument`}>
      <span className="flex items-center gap-1">
        <h3 id={id} className="truncate text-[16.5px] font-semibold tracking-[-0.015em] text-ink">{name}</h3>
        <ChevronDown aria-hidden className="ip-chev h-4 w-4 shrink-0 text-ink-3" />
      </span>
      <span className="block text-[12px] text-ink-3">{sub}</span>
    </button>
  );
}
