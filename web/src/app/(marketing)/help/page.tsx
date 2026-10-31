import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { SectionHeader } from "@/components/ui/section";
import { HelpCenter } from "@/components/marketing/help-center";

export const metadata: Metadata = {
  title: "Help Center",
  description: "Answers about connecting MT4 and MT5, understanding your numbers, community verification, billing and privacy.",
  alternates: { canonical: "/help" },
};

export default function Page() {
  return (
    <section className="py-14 sm:py-20">
      <Container className="max-w-4xl">
        <div className="rise"><SectionHeader as="h1" align="center" eyebrow="Help Center" title="How can we help?" /></div>
        <div className="mt-10"><HelpCenter /></div>
      </Container>
    </section>
  );
}
