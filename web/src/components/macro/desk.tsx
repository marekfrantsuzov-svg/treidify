import { Activity, CircleCheck, CircleX, Droplets, Gauge, GitBranch, Globe2, Hourglass, Landmark, LineChart, Newspaper, Percent, Scale, ShieldAlert, Sparkles, Target, TrendingDown, TrendingUp, Zap } from "lucide-react";
import {
  biasReasons, liquidityView, latestStructure, momentumLabel, rsiOf, tfStates,
  type GoldImpact, type InstrumentIntel, type Relation, type Scenario, type SentEvent, type SentHeadline, type ZoneBrief,
} from "@/lib/intelligence";
import { AssetMark } from "@/components/ui/flags";
import { cn } from "@/lib/cn";
import { BiasBadge, More, PriceLadder, SourceChip, StopMeter, TfRow, fmtP } from "./parts";

const NAME: Record<string, { name: string; sub: string }> = { XAUUSD: { name: "Gold", sub: "XAUUSD" }, DXY: { name: "US Dollar Index", sub: "DXY" }, XAGUSD: { name: "Silver", sub: "XAGUSD" } };

function Stat({ icon, label, children, tone }: { icon: React.ReactNode; label: string; children: React.ReactNode; tone?: "up" | "down" | "flat" }) {
  return (
    <div className="stat-tile">
      <div className="flex items-center gap-1.5 text-[11.5px] font-medium text-ink-3 [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}{label}</div>
      <div className={cn("mt-1 text-[13.5px] font-semibold leading-snug", tone === "up" ? "text-up-ink" : tone === "down" ? "text-down-ink" : "text-ink")}>{children}</div>
    </div>
  );
}

/** Gold, DXY or Silver at a glance: bias, timeframe pills, structure, momentum, liquidity, zones and the relationship. */
export function MarketCard({ i, quote, sample, relation, note }: {
  i: InstrumentIntel; quote: { last: number | null; changePct: number | null }; sample: boolean;
  relation?: Relation & { title: string }; note?: string | null;
}) {
  const d = i.digits, n = NAME[i.symbol] ?? { name: i.symbol, sub: "" };
  const ev = latestStructure(i);
  const rsi = rsiOf(i), mom = momentumLabel(rsi);
  const liq = liquidityView(i);
  const buy = i.zones.find((z) => z.side === "buy"), sell = i.zones.find((z) => z.side === "sell");
  const pts = [buy?.lower, buy?.upper, sell?.lower, sell?.upper, i.lastPrice, liq.above?.price, liq.below?.price].filter((v): v is number => typeof v === "number");
  const lo = Math.min(...pts), hi = Math.max(...pts), pad = (hi - lo) * 0.08 || Math.abs(hi) * 0.002;
  return (
    <article className={cn("dcard dcard-pad lift flex h-full flex-col", `glow-${i.bias}`)} aria-labelledby={`mc-${i.symbol}`}>
      <header className="flex items-start gap-3">
        <span className="asset-orb"><AssetMark symbol={i.symbol} size={30} /></span>
        <div className="min-w-0 flex-1">
          <h3 id={`mc-${i.symbol}`} className="truncate text-[16.5px] font-semibold tracking-[-0.015em] text-ink">{n.name}</h3>
          <p className="text-[12px] text-ink-3">{n.sub}</p>
        </div>
        <BiasBadge bias={i.bias} />
      </header>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span className="num text-[26px] font-semibold tracking-[-0.025em] text-ink">{quote.last !== null ? fmtP(quote.last, d) : "—"}</span>
        {quote.changePct !== null && <span className={cn("num text-[13px] font-semibold", quote.changePct >= 0 ? "text-up-ink" : "text-down-ink")}>{quote.changePct >= 0 ? "+" : "−"}{Math.abs(quote.changePct).toFixed(2)}%</span>}
        {sample && <SourceChip kind="sample" />}
      </div>
      <div className="mt-3"><TfRow states={tfStates(i)} /></div>
      {pts.length >= 2 && (
        <div className="mt-4">
          <PriceLadder lo={lo - pad} hi={hi + pad} digits={d} price={i.lastPrice} label={`${n.name} price relative to its buy and sell zones`}
            bands={[buy, sell].filter((z): z is NonNullable<typeof z> => !!z).map((z) => ({ side: z.side, lower: z.lower, upper: z.upper }))} />
          <div className="mt-1.5 flex justify-between text-[11px] text-ink-3">
            <span>{buy ? <>Buy <span className="num text-up-ink">{fmtP(buy.lower, d)}–{fmtP(buy.upper, d)}</span></> : "No buy zone"}</span>
            <span>{sell ? <>Sell <span className="num text-down-ink">{fmtP(sell.lower, d)}–{fmtP(sell.upper, d)}</span></> : "No sell zone"}</span>
          </div>
        </div>
      )}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Stat icon={<GitBranch />} label="Structure" tone={ev?.direction === "bullish" ? "up" : ev?.direction === "bearish" ? "down" : undefined}>
          {ev ? <>{ev.tf} {ev.kind} {ev.direction === "bullish" ? "↑" : "↓"} <span className="num font-medium text-ink-2">{fmtP(ev.level, d)}</span></> : <span className="text-ink-3">No BOS / CHOCH</span>}
        </Stat>
        <Stat icon={<Activity />} label="Momentum" tone={mom.tone === "bullish" ? "up" : mom.tone === "bearish" ? "down" : undefined}>
          {mom.label}{rsi !== null && <span className="num font-medium text-ink-2"> · RSI {rsi.toFixed(0)}</span>}
        </Stat>
        <div className="col-span-2">
          <Stat icon={<Droplets />} label="Liquidity">
            <span className="font-medium text-ink-2">{liq.summary}</span>
          </Stat>
        </div>
      </div>
      {relation && (
        <div className={cn("rel-box mt-3", `is-${relation.tone}`)}>
          <div className="flex flex-wrap items-center justify-between gap-1.5"><span className="text-[12px] font-medium text-ink-2">{relation.title}</span><span className="rel-chip">{relation.label}</span></div>
          <p className="mt-1 text-[12.5px] leading-snug text-ink-2">{relation.text}</p>
        </div>
      )}
      <div className="mt-auto pt-3">
        <More summary={<span className="text-[13px] font-semibold text-ink">Why {i.bias === "insufficient" ? "no reading" : i.bias}, and what changes it</span>}>
          <ul className="grid gap-1.5 text-[12.5px] leading-snug text-ink-2">{biasReasons(i).map((r) => <li key={r} className="flex gap-2"><span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[var(--text-3)]" />{r}</li>)}</ul>
          <div className="mt-2.5 rounded-xl bg-warn-soft px-3 py-2 text-[12.5px] leading-snug text-ink"><b className="font-semibold">Invalidation. </b>{i.invalidation ?? "No directional bias, so nothing to invalidate yet."}</div>
          {i.volatility && <p className="mt-2 text-[12px] text-ink-3">Volatility: {i.volatility}.</p>}
          {note && <div className="mt-2.5 rounded-xl bg-accent-soft px-3 py-2 text-[12.5px] leading-snug text-ink"><span className="mb-0.5 flex items-center gap-1 text-[11px] font-semibold text-accent"><Sparkles className="h-3.5 w-3.5" />AI explanation of the computed facts</span>{note}</div>}
        </More>
      </div>
    </article>
  );
}

const STATUS_TEXT = { watching: "Watching", "in-zone": "Price in zone", confirmed: "5M confirmed" } as const;

/** A key buy or sell zone: range, readiness against the 50-pip rule, and the reasoning in short labelled rows. */
export function ZoneCard({ b, digits, side }: { b: ZoneBrief | null; digits: number; side: "buy" | "sell" }) {
  const buy = side === "buy";
  if (!b) {
    return (
      <article className={cn("dcard dcard-pad zone-card", buy ? "is-buy" : "is-sell")}>
        <p className="zone-kicker">{buy ? "Buy zone" : "Sell zone"}</p>
        <p className="mt-2 text-[15px] font-semibold text-ink">No qualified {side} zone near price</p>
        <p className="mt-1 text-[13px] text-ink-2">A zone appears here when 1H {buy ? "support" : "resistance"} or a 61.8–78.6% retracement forms on the correct side of price and has not been invalidated.</p>
      </article>
    );
  }
  const z = b.zone;
  const rows: { icon: React.ReactNode; k: string; v: string }[] = [
    { icon: <Target />, k: "Why it matters", v: b.why.join(". ") + "." },
    { icon: <Percent />, k: "Fibonacci", v: b.fib ?? "No Fibonacci level inside this zone." },
    { icon: <Droplets />, k: "Liquidity", v: b.liquidity },
    { icon: <GitBranch />, k: "Structure", v: b.structure },
    { icon: <CircleCheck />, k: "Confirmation", v: b.confirmation },
    { icon: <CircleX />, k: "Invalidation", v: b.invalidation },
  ];
  return (
    <article className={cn("dcard dcard-pad zone-card lift", buy ? "is-buy" : "is-sell")} aria-label={`${side} zone ${b.range}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="zone-kicker">{buy ? <TrendingUp aria-hidden /> : <TrendingDown aria-hidden />}{buy ? "Buy zone" : "Sell zone"}</p>
          <p className="num mt-1.5 text-[24px] font-semibold tracking-[-0.025em] text-ink">{fmtP(z.lower, digits)} <span className="text-ink-3">–</span> {fmtP(z.upper, digits)}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 max-[459px]:w-full max-[459px]:flex-row max-[459px]:items-center max-[459px]:justify-between">
          <span className={cn("ready-pill", b.readiness === "ready" ? "is-ready" : "is-wait")}>{b.readiness === "ready" ? <Zap aria-hidden /> : <Hourglass aria-hidden />}{b.readiness === "ready" ? "Ready" : "Wait"}</span>
          <span className="text-[11.5px] text-ink-3">{STATUS_TEXT[z.status]}{z.status === "watching" && z.distanceATR !== null ? ` · ${z.distanceATR} ATR away` : ""}</span>
        </div>
      </div>
      <div className="mt-4">
        <PriceLadder lo={b.diagram.lo} hi={b.diagram.hi} digits={digits} price={b.diagram.price} stop={b.diagram.stop} bands={[{ side, lower: z.lower, upper: z.upper }]} label={`Zone ${b.range}, stop ${fmtP(b.diagram.stop, digits)}${b.diagram.price !== null ? `, price ${fmtP(b.diagram.price, digits)}` : ""}`} />
        <div className="mt-1.5 flex items-center gap-3 text-[11px] text-ink-3"><span className="inline-flex items-center gap-1"><span className={cn("h-2 w-3 rounded-sm", buy ? "bg-up/40" : "bg-down/40")} />Zone</span><span className="inline-flex items-center gap-1"><span className="h-2.5 w-0 border-l-2 border-dashed border-[var(--down)]" />Stop</span><span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[var(--text)]" />Price</span></div>
      </div>
      {b.maxStopPips !== null && <div className="mt-4"><StopMeter pips={b.stopPips} max={b.maxStopPips} /></div>}
      <p className={cn("mt-3 rounded-xl px-3 py-2 text-[12.5px] leading-snug", b.readiness === "ready" ? "bg-up-soft text-ink" : "bg-warn-soft text-ink")}>{b.readinessText}</p>
      <dl className="zone-rows mt-3">
        {rows.map((r) => <div key={r.k}><dt><span aria-hidden>{r.icon}</span>{r.k}</dt><dd>{r.v}</dd></div>)}
      </dl>
    </article>
  );
}

const SC_ICON = { bullish: TrendingUp, bearish: TrendingDown, wait: Hourglass } as const;

/** One scenario: the conditions it needs, which timeframes support it, and its invalidation, in an expandable list. */
export function ScenarioCard({ s }: { s: Scenario }) {
  const Icon = SC_ICON[s.id];
  return (
    <article className={cn("dcard dcard-pad scenario lift", `is-${s.id}`, s.active && "is-active")} aria-label={s.title}>
      <div className="flex items-center gap-2.5">
        <span className="scenario-icon" aria-hidden><Icon /></span>
        <h3 className="min-w-0 flex-1 text-[15px] font-semibold tracking-[-0.01em] text-ink">{s.title}</h3>
        {s.active && <span className="current-chip">Current read</span>}
      </div>
      <p className="mt-2.5 text-[13.5px] leading-snug text-ink">{s.headline}</p>
      <div className="mt-3"><p className="mb-1.5 text-[11.5px] font-medium text-ink-3">Timeframes supporting it</p><TfRow states={s.alignment} dimUnsupported /></div>
      <div className="mt-auto pt-3">
        <More summary={<span className="text-[13px] font-semibold text-ink">{s.id === "wait" ? "Why waiting" : "Conditions and invalidation"}</span>} open={s.active}>
          <ul className="grid gap-1.5">
            {s.requirements.map((r) => {
              const met = /\(in place\)/.test(r);
              return <li key={r} className="flex gap-2 text-[12.5px] leading-snug text-ink-2">{met ? <CircleCheck className="mt-px h-4 w-4 shrink-0 text-up" aria-label="In place" /> : <span className="mt-[5px] h-2.5 w-2.5 shrink-0 rounded-full border-[1.5px] border-[var(--text-3)]" aria-label="Not yet" />}{r.replace(" (in place)", "")}</li>;
            })}
          </ul>
          <p className="mt-2.5 flex gap-2 text-[12.5px] leading-snug text-ink-2"><ShieldAlert className="mt-px h-4 w-4 shrink-0 text-warn" aria-hidden />{s.invalidation}</p>
        </More>
      </div>
    </article>
  );
}

// ── Sentiment ───────────────────────────────────────────────────────────────────────────────────────────────

function ago(iso: string, now: number) {
  const m = Math.max(0, Math.round((now - Date.parse(iso)) / 60000));
  return m < 60 ? `${m}m` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`;
}

function HeadlineMini({ h, now }: { h: SentHeadline[]; now: number }) {
  return (
    <ul className="grid gap-1.5">
      {h.map((x) => (
        <li key={x.url}><a href={x.url} target="_blank" rel="noopener noreferrer" className="group block rounded-lg text-[12.5px] leading-snug text-ink hover:text-accent">
          <span className="line-clamp-2">{x.title}</span><span className="text-[11px] text-ink-3">{x.source} · {ago(x.publishedAt, now)} ago</span>
        </a></li>
      ))}
    </ul>
  );
}

function SentCard({ icon, title, kind, kindLabel, children, className }: { icon: React.ReactNode; title: string; kind: "fact" | "model" | "na" | "sample"; kindLabel?: string; children: React.ReactNode; className?: string }) {
  return (
    <article className={cn("dcard dcard-pad lift flex flex-col", className)} aria-label={title}>
      <div className="flex items-start gap-2.5">
        <span className="sent-icon" aria-hidden>{icon}</span>
        <h3 className="min-w-0 flex-1 pt-1 text-[14.5px] font-semibold tracking-[-0.01em] text-ink">{title}</h3>
        <SourceChip kind={kind} label={kindLabel} />
      </div>
      <div className="mt-3 flex-1">{children}</div>
    </article>
  );
}

function Unavailable({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-line px-3 py-2.5 text-[12.5px] leading-snug text-ink-3">{children}</p>;
}

function Release({ e, tz, label }: { e: SentEvent; tz: string; label: string }) {
  const when = new Date(e.at).toLocaleString("en-GB", { timeZone: tz, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  return (
    <div className="stat-tile">
      <div className="flex items-center justify-between gap-2 text-[11.5px] text-ink-3"><span className="font-medium">{label}</span><span>{when}</span></div>
      <div className="mt-0.5 text-[13px] font-semibold text-ink">{e.country} {e.title}</div>
      <div className="num mt-0.5 flex flex-wrap gap-x-3 text-[12px] text-ink-2">
        {e.actual && <span>Actual <b className="text-ink">{e.actual}</b></span>}
        {e.forecast && <span>Forecast {e.forecast}</span>}
        {e.previous && <span>Previous {e.previous}</span>}
      </div>
    </div>
  );
}

const READ_POS = { bearish: 0, mixed: 1, bullish: 2, insufficient: -1 } as const;

/** The gold read as a three-state indicator: where it sits, not a percentage. */
function ReadDial({ read }: { read: GoldImpact["read"] }) {
  const pos = READ_POS[read];
  return (
    <div className="read-dial" role="img" aria-label={`Gold read: ${read}`}>
      {(["Bearish", "Mixed", "Bullish"] as const).map((l, k) => <span key={l} className={cn("read-seg", `seg-${k}`, k === pos && "is-on")}>{l}</span>)}
    </div>
  );
}

export interface SentimentInput {
  newsOk: boolean; newsNeeds?: string[]; calOk: boolean; calNeeds?: string[];
  risk: SentHeadline[]; geo: SentHeadline[]; cb: SentHeadline[]; yld: SentHeadline[]; relevant: SentHeadline[];
  rates: { last: SentEvent | null; next: SentEvent | null }; inflation: { last: SentEvent | null; next: SentEvent | null };
  dxy: InstrumentIntel; sample: boolean; impact: GoldImpact; tz: string; now: number;
}

export function SentimentGrid(p: SentimentInput) {
  const newsMissing = <Unavailable>The news feed is not connected{p.newsNeeds?.length ? ` (needs ${p.newsNeeds.join(", ")})` : ""}. Nothing is estimated in its place.</Unavailable>;
  const calMissing = <Unavailable>The economic calendar is not connected{p.calNeeds?.length ? ` (needs ${p.calNeeds.join(", ")})` : ""}.</Unavailable>;
  const impact = p.impact;
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 sm:gap-4">
      <SentCard icon={<Scale />} title="Possible implications for Gold" kind="model" className="md:col-span-2 xl:col-span-1 xl:row-span-2">
        {impact.read === "insufficient" ? <Unavailable>Not enough verified structure to form a read.</Unavailable> : (
          <>
            <ReadDial read={impact.read} />
            <div className="mt-3 flex flex-wrap items-center gap-2"><span className="text-[15px] font-semibold text-ink">{impact.label}</span><span className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-semibold", impact.uncertainty === "high" ? "bg-down-soft text-down-ink" : impact.uncertainty === "medium" ? "bg-warn-soft text-warn" : "bg-up-soft text-up-ink")}>{impact.uncertainty} uncertainty</span></div>
            <ul className="mt-2.5 grid gap-1.5">{impact.reasons.map((r) => <li key={r} className="flex gap-2 text-[12.5px] leading-snug text-ink-2"><span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-accent" />{r}</li>)}</ul>
            <p className="mt-3 text-[11.5px] leading-snug text-ink-3">A qualitative read from DXY and Gold structure plus scheduled US events. It is not a probability or a forecast.</p>
          </>
        )}
      </SentCard>
      <SentCard icon={<Gauge />} title="Market risk sentiment" kind={p.newsOk && p.risk.length ? "fact" : "na"} kindLabel={p.newsOk && p.risk.length ? "Headlines only" : undefined}>
        {!p.newsOk ? newsMissing : p.risk.length ? <><HeadlineMini h={p.risk} now={p.now} /><p className="mt-2 text-[11.5px] text-ink-3">No risk-sentiment score is shown: it needs an equities or volatility feed.</p></> : <Unavailable>No risk-related headlines in the current feed. A sentiment score needs an equities or volatility feed, which is not connected.</Unavailable>}
      </SentCard>
      <SentCard icon={<Globe2 />} title="Geopolitical developments" kind={p.newsOk && p.geo.length ? "fact" : "na"}>
        {!p.newsOk ? newsMissing : p.geo.length ? <HeadlineMini h={p.geo} now={p.now} /> : <Unavailable>No geopolitical headlines in the current feed.</Unavailable>}
      </SentCard>
      <SentCard icon={<Landmark />} title="Central banks and rates" kind={p.calOk || (p.newsOk && p.cb.length) ? "fact" : "na"}>
        {!p.calOk ? calMissing : (
          <div className="grid gap-2">
            {p.rates.last ? <Release e={p.rates.last} tz={p.tz} label="Last decision" /> : <Unavailable>No recent rate decision in the calendar window.</Unavailable>}
            {p.rates.next && <Release e={p.rates.next} tz={p.tz} label="Next decision" />}
          </div>
        )}
        {p.newsOk && p.cb.length > 0 && <div className="mt-2.5"><HeadlineMini h={p.cb.slice(0, 2)} now={p.now} /></div>}
      </SentCard>
      <SentCard icon={<Percent />} title="Inflation and releases" kind={p.calOk ? "fact" : "na"}>
        {!p.calOk ? calMissing : (
          <div className="grid gap-2">
            {p.inflation.last ? <Release e={p.inflation.last} tz={p.tz} label="Latest release" /> : <Unavailable>No CPI, PCE or PPI release in the calendar window.</Unavailable>}
            {p.inflation.next && <Release e={p.inflation.next} tz={p.tz} label="Next release" />}
          </div>
        )}
      </SentCard>
      <SentCard icon={<LineChart />} title="Treasury yields and USD" kind={p.sample ? "sample" : "fact"} kindLabel={p.sample ? "USD on sample bars" : "USD from market data"}>
        <div className="grid gap-2">
          <div className="stat-tile"><div className="text-[11.5px] font-medium text-ink-3">US Dollar Index structure</div><div className="mt-1 flex flex-wrap items-center gap-2"><BiasBadge bias={p.dxy.bias} size="sm" /><TfRow states={tfStates(p.dxy).slice(0, 2)} /></div></div>
          <Unavailable>US 10-year and real yields need a yields source (for example FRED). They are not estimated.</Unavailable>
          {p.newsOk && p.yld.length > 0 && <HeadlineMini h={p.yld.slice(0, 2)} now={p.now} />}
        </div>
      </SentCard>
      <SentCard icon={<Newspaper />} title="Relevant news for Gold and USD" kind={p.newsOk ? "fact" : "na"} className="md:col-span-2 xl:col-span-2">
        {!p.newsOk ? newsMissing : p.relevant.length ? <div className="grid gap-x-6 sm:grid-cols-2"><HeadlineMini h={p.relevant.slice(0, 2)} now={p.now} /><HeadlineMini h={p.relevant.slice(2, 4)} now={p.now} /></div> : <Unavailable>No Gold or USD headlines in the current feed.</Unavailable>}
      </SentCard>
    </div>
  );
}

