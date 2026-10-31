import { Analytics, CookieBanner } from "@/components/marketing/consent";
import { Footer } from "@/components/marketing/footer";
import { Header } from "@/components/marketing/header";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main id="main">{children}</main>
      <Footer />
      <CookieBanner />
      <Analytics />
    </>
  );
}
