import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";

type Need = "market" | "sync" | "news" | "ai";

const TOOLS: { title: string; body: string; href: string; needs?: Need[] }[] = [
  { title: "Account Health", body: "One score for how well you trade, with the factors behind it.", href: "/account-health", needs: ["sync"] },
  { title: "MT5 sync", body: "Read-only investor password. Treidify can never place a trade.", href: "/brokers", needs: ["sync"] },
  { title: "Zone engine", body: "Supply and demand on 15M, 1H and 4H, held to the 50-pip rule.", href: "/chart-analysis", needs: ["market"] },
  { title: "Fibonacci and liquidity", body: "Retracements of the last leg, equal highs and lows, resting liquidity.", href: "/chart-analysis", needs: ["market"] },
  { title: "Macro Desk", body: "Gold, the dollar and the markets you pick, side by side.", href: "/macro-desk", needs: ["market"] },
  { title: "Economic calendar", body: "Scheduled events, rated by their likely effect on gold.", href: "/market-intelligence", needs: ["news"] },
  { title: "Trading journal", body: "P&L calendar, equity curve, notes and tags on every trade.", href: "/journal", needs: ["sync"] },
  { title: "AI coach", body: "Weekly reviews built on patterns in your own trades.", href: "/ai-coach", needs: ["sync", "ai"] },
  { title: "Community", body: "Verified traders, and AI analysts that are always labelled AI.", href: "/community" },
];
const NEED_LABEL: Record<Need, string> = { market: "Live data soon", sync: "Opening soon", news: "Live feed soon", ai: "AI soon" };

/** Scene: the whole product as a typographic index. No orbit, no icon tiles: a name, one line, and its status. */
export function EdTools({ live }: { live: Record<Need, boolean> }) {
  return (
    <section id="features" className="ed-section" aria-labelledby="tools-title">
      <Container>
        <div className="ed-index">
          <Reveal className="ed-index-head">
            <p className="ed-kicker">One platform</p>
            <h2 id="tools-title" className="ts-h2 ed-head-title">Nine tools. One account, one set of risk rules.</h2>
            <p className="ts-body ed-head-lead">The chart, the journal and the coach read the same data, so they always agree with each other.</p>
          </Reveal>
          <ul className="ed-index-list">
            {TOOLS.map((t) => {
              const missing = t.needs?.find((n) => !live[n]);
              return (
                <li key={t.title}>
                  <Link href={t.href} className="ed-index-row">
                    <span className="ed-index-title">{t.title}</span>
                    <span className="ed-index-body">{t.body}</span>
                    <span className="ed-index-meta">
                      {missing && <em>{NEED_LABEL[missing]}</em>}
                      <ArrowUpRight className="h-4 w-4" aria-hidden />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </Container>
    </section>
  );
}

const STEPS = [
  { n: "01", title: "Create your account", body: "Email sign-up in under a minute. No card. Every Premium feature for 72 hours, with no automatic billing.", sync: false },
  { n: "02", title: "Connect your trading data", body: "Link MT5 with a read-only investor password. Your history syncs and every figure is computed from your trades.", sync: true },
  { n: "03", title: "Read before you trade", body: "Check the Gold read, the key zones and the event risk. Then review what your own trades say in the coach.", sync: false },
];

export function EdSteps({ syncLive }: { syncLive: boolean }) {
  return (
    <section id="how-it-works" className="ed-section" aria-labelledby="steps-title">
      <Container>
        <Reveal className="ed-head">
          <p className="ed-kicker">How it works</p>
          <h2 id="steps-title" className="ts-h2 ed-head-title">Three steps to a clearer view.</h2>
        </Reveal>
        <ol className="ed-steps">
          {STEPS.map((s, i) => (
            <li key={s.n} className="ed-step"><Reveal delay={i * 0.06}>
              <span className="ed-step-n num" aria-hidden>{s.n}</span>
              <h3 className="ts-h3">{s.title}</h3>
              <p className="ts-body">{s.body}</p>
              {s.sync && !syncLive && <p className="ed-fine">MT5 sync is opening soon. Try it now with a labelled demo account.</p>}
            </Reveal></li>
          ))}
        </ol>
      </Container>
    </section>
  );
}

/** Closing scene: the hero's promise again, with the same single action. No box, no glow. */
export function EdFinal() {
  return (
    <section className="ed-section ed-final" aria-labelledby="final-title">
      <Container>
        <Reveal className="ed-final-inner">
          <h2 id="final-title" className="ts-display ed-final-title">Trade with more clarity. <span className="ed-quiet">Start today.</span></h2>
          <div className="ed-final-row">
            <p className="ts-lead">Create a free account in under a minute. Connect MT5 whenever you are ready.</p>
            <div className="ed-hero-actions">
              <ButtonLink href="/signup" size="lg" className="ed-cta">Create free account <ArrowRight className="h-4 w-4" /></ButtonLink>
              <Link href="/pricing" className="ed-textlink">See pricing <ArrowRight className="h-4 w-4" /></Link>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
