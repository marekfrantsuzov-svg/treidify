import Link from "next/link";
import { footerNav, RISK_LINE, site } from "@/config/site";
import { Container } from "@/components/ui/container";
import { Wordmark } from "@/components/ui/wordmark";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line pb-10 pt-16">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <Wordmark />
            <p className="mt-3 text-sm text-ink-2">{site.tagline}</p>
            <p className="mt-6 max-w-xs text-xs leading-relaxed text-ink-3">{RISK_LINE}</p>
          </div>
          {footerNav.map((col) => (
            <nav key={col.heading} aria-label={col.heading}>
              <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-3">{col.heading}</h3>
              <ul className="mt-4 grid gap-2.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-ink-2 transition-colors hover:text-ink">
                      {l.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-14 flex flex-col gap-3 border-t border-line pt-6 text-xs text-ink-3 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} Treidify. All rights reserved.</p>
          <p>MetaTrader is a trademark of MetaQuotes Ltd. Treidify is independent and not affiliated with MetaQuotes or any broker.</p>
        </div>
      </Container>
    </footer>
  );
}
