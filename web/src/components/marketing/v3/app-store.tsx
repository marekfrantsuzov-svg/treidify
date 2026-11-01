import Image from "next/image";
import { Globe2, Smartphone } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Phone, Shot } from "./shot";

/** Web is the product today; the iOS app is announced, with no download link until it is actually published. */
export function AppStoreSoon() {
  return (
    <div className="appstore glass relative overflow-hidden rounded-[32px] p-6 sm:p-10 lg:p-12">
      <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div>
          <div className="flex items-center gap-4">
            <span className="app-icon"><Image src="/brand/treidify-t-256.webp" alt="Treidify app icon" width={84} height={84} /></span>
            <div>
              <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-accent">Coming soon</p>
              <h2 className="text-gradient mt-1 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Treidify for iPhone</h2>
            </div>
          </div>
          <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-ink-2">The full Treidify platform runs on the web today, in any modern browser on your phone, tablet or computer. A native iOS app is in development and will arrive on the App Store later.</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <ButtonLink href="/signup" size="lg"><Globe2 className="h-4 w-4" />Use Treidify on the web</ButtonLink>
            <span className="appstore-badge" aria-label="App Store: coming soon, not yet available">
              <Smartphone className="h-6 w-6" aria-hidden /><span className="leading-tight"><span className="block text-[10.5px] opacity-80">Coming soon on the</span><span className="block text-[17px] font-semibold tracking-[-0.01em]">App Store</span></span>
            </span>
          </div>
          <p className="mt-3 text-[12.5px] text-ink-3">Not yet available to download. There is no Treidify app in the App Store until we announce it here.</p>
        </div>
        <div className="mx-auto w-[220px] sm:w-[250px]"><Phone><Shot name="phone-macro" alt="Treidify Macro Desk on iPhone, shown with sample data." /></Phone></div>
      </div>
    </div>
  );
}
