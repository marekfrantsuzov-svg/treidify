import type { Metadata, Viewport } from "next";
import "./globals.css";
import { site } from "@/config/site";
import { Providers } from "@/components/providers/providers";
import { GlassIconDefs } from "@/components/icons/glass-icon";

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
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh">
        <Providers>
          <div className="atmosphere" aria-hidden />
          <GlassIconDefs />
          {children}
        </Providers>
      </body>
    </html>
  );
}
