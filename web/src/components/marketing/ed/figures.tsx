import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";

/**
 * Scene two: the rules Treidify is built on, set as large figures. Every number is a product rule or a product fact,
 * never a performance claim: the 50-pip XAUUSD stop limit (1 pip = $0.10), the three analysis timeframes, the 72-hour
 * trial, and the fact that a read-only MT5 connection cannot place a trade.
 */
const FIGURES = [
  { value: "50", unit: "pips", label: "Maximum structural stop on a Gold setup", body: "That is $5.00 of price movement. If the structure needs more, the answer is wait, never a tighter stop." },
  { value: "3", unit: "timeframes", label: "Zones computed separately", body: "Supply, demand, Fibonacci and liquidity on 15M, 1H and 4H, each from its own candles." },
  { value: "5M", unit: "", label: "Confirmation before any setup", body: "A zone touch is not a setup. A 5M change of character has to happen first." },
  { value: "0", unit: "trades placed", label: "MT5 is read-only", body: "Treidify connects with an investor password. It can read your history and can never trade." },
];

export function EdFigures() {
  return (
    <section className="ed-section ed-figures" aria-labelledby="figures-title">
      <Container>
        <Reveal className="ed-head">
          <p className="ed-kicker">The rules behind every read</p>
          <h2 id="figures-title" className="ts-h2 ed-head-title">Numbers you can hold the product to.</h2>
        </Reveal>
        <dl className="ed-figure-grid">
          {FIGURES.map((f, i) => (
            <Reveal key={f.label} delay={i * 0.05} className="ed-figure">
              <dt className="ed-figure-label">{f.label}</dt>
              <dd className="ed-figure-value num">
                {f.value}
                {f.unit && <span className="ed-figure-unit">{f.unit}</span>}
              </dd>
              <dd className="ed-figure-body">{f.body}</dd>
            </Reveal>
          ))}
        </dl>
      </Container>
    </section>
  );
}
