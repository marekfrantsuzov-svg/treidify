import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "./system.css";
import { site } from "@/config/site";
import { Providers } from "@/components/providers/providers";
import { GlassIconDefs } from "@/components/icons/glass-icon";
import { Waves } from "@/components/brand/waves";

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
    { media: "(prefers-color-scheme: dark)", color: "#08070d" },
    { media: "(prefers-color-scheme: light)", color: "#f0f0f0" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="min-h-dvh">
        <Providers>
          <div className="atmosphere" aria-hidden />
          <Waves />
          <GlassIconDefs />
          {children}
        </Providers>
      </body>
    </html>
  );
}
