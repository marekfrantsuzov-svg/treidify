import { Faq } from "../feature-page";

const FAQS = [
  { q: "Is Treidify a signal service?", a: "No. Treidify shows market structure, zones, events and your own statistics so you can decide. It never places trades and nothing on it is investment advice." },
  { q: "How does the 3-day trial work?", a: "Choose Essential or Premium and add a card at checkout. Nothing is charged for 3 days. If you do not cancel before the trial ends, the plan renews automatically, monthly or yearly." },
  { q: "Can Treidify trade on my account?", a: "No. You connect MT4 or MT5 with the investor (read-only) password, which cannot place trades or withdraw. Treidify has no trading functions at all." },
  { q: "How fresh is my account data?", a: "Balance, equity, positions and history sync once an hour, and you can refresh by hand. The dashboard always shows when the figures were last synced." },
  { q: "What is the 50-pip rule?", a: "On gold a setup needs a structural stop of 50 pips ($5.00 of price) or less. If the structure needs more, the answer is to wait, never a tighter stop." },
  { q: "What is the difference between Essential and Premium?", a: "Essential covers your own trading: analytics, Account Health and the journal for one account. Premium adds a second account, AI analysis and the AI Coach, news intelligence and the Macro Desk." },
  { q: "Can I cancel any time?", a: "Yes, from Settings › Plan › Manage billing. Your plan stays active until the end of the period already paid." },
];

/** Homepage FAQ: plain answers, the same facts the product enforces. */
export function LandingFaq() {
  return (
    <section className="lx-section" id="faq" aria-labelledby="faq-title">
      <div className="mx-auto w-full max-w-3xl px-5 sm:px-8">
        <p className="ed-kicker">Questions</p>
        <h2 id="faq-title" className="ts-h2 mb-8">Straight answers.</h2>
        <Faq faqs={FAQS} />
      </div>
    </section>
  );
}
