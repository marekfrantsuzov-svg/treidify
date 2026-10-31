import type { MetadataRoute } from "next";
import { footerNav, site } from "@/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = new Set<string>(["/", ...footerNav.flatMap((c) => c.links.map((l) => l.href))]);
  return [...paths].map((p) => ({ url: new URL(p, site.url).toString(), changeFrequency: p === "/" ? "weekly" : "monthly", priority: p === "/" ? 1 : 0.7 }));
}
