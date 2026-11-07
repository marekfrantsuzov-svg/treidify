import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "./system.css";
import "./glass.css";
import "./v5.css";
import { site } from "@/config/site";
import { Providers } from "@/components/providers/providers";
import { GlassIconDefs } from "@/components/icons/glass-icon";
import { Waves } from "@/components/brand/waves";
import { Ambient } from "@/components/brand/ambient";

/**
 * Inter 4 (variable, latin) with the optical-size axis: text sizes get the Text cut, headings and large figures get the
 * tighter Display cut automatically. Self-hosted and preloaded by Next with a metric-matched fallback: no layout shift.
 */
const inter = localFont({
  src: "../../node_modules/@fontsource-variable/inter/files/inter-latin-opsz-normal.woff2",
  weight: "100 900",
  variable: "--font-inter",
  display: "swap",
  fallback: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "system-ui", "sans-serif"],
});

/**
 * Geist (OFL, Vercel) for display type: headlines, navigation and primary buttons. Chosen by glyph comparison with
 * Marek's landing reference (closest open match; the reference resembles SF Pro Display, which may not be licensed
 * for websites). Inter stays for body text and figures.
 */
const geist = localFont({
  src: "../../node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2",
  weight: "100 900",
  variable: "--font-display",
  display: "swap",
  fallback: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name}: ${site.tagline}`, template: `%s · ${site.name}` },
  description: site.description,
  applicationName: site.name,
  openGraph: { type: "website", siteName: site.name, title: `${site.name}: ${site.tagline}`, description: site.description, url: site.url },
  twitter: { card: "summary_large_image", title: `${site.name}: ${site.tagline}`, description: site.description },
  robots: { index: true, follow: true },
  // Added to an iPhone home screen, Treidify opens full screen; the app chrome pads for the status bar and Dynamic Island.
  appleWebApp: { capable: true, title: site.name, statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    // Dark is the default for every visitor; the provider swaps this to the light value once someone picks light.
    { color: "#07060c" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${geist.variable}`}>
      <body className="min-h-dvh">
        <Providers>
          <Ambient />
          <Waves />
          <GlassIconDefs />
          {children}
        </Providers>
      </body>
    </html>
  );
}
