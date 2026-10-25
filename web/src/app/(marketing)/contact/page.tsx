import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Glass } from "@/components/ui/glass";
import { SectionHeader } from "@/components/ui/section";
import { ContactForm } from "@/components/forms/contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact the Treidify team about your account, connections, billing, privacy or partnerships.",
  alternates: { canonical: "/contact" },
};

export default function Page() {
  return (
    <section className="py-14 sm:py-20">
      <Container className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rise">
          <SectionHeader as="h1" eyebrow="Contact" title="Talk to us." lead="Questions about your account, a connection, billing or your data. We read every message." />
          <Glass className="mt-8 p-5 text-sm text-ink-2">Looking for a quick answer? The <Link href="/help" className="text-accent hover:underline">Help Center</Link> covers connecting MT4/MT5, your numbers, the trial and privacy.</Glass>
        </div>
        <div className="rise" style={{ "--d": "0.08s" } as React.CSSProperties}><ContactForm /></div>
      </Container>
    </section>
  );
}
