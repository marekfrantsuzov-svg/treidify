import type { Metadata } from "next";
import { CookieSettings } from "@/components/marketing/consent";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = { title: "Cookie settings", alternates: { canonical: "/legal/cookies" } };

export default function Page() {
  return (
    <section className="py-14 sm:py-20">
      <Container className="max-w-2xl">
        <h1 className="text-gradient text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Cookie settings</h1>
        <p className="mt-4 text-lg text-ink-2">Choose what Treidify may store in your browser. You can change this at any time.</p>
        <div className="mt-8"><CookieSettings /></div>
      </Container>
    </section>
  );
}
