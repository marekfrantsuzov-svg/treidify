import type { MetadataRoute } from "next";
import { site } from "@/config/site";

/** Lets Treidify be added to an iPhone or Android home screen and open full screen, like a native app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.name,
    short_name: site.name,
    description: site.description,
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#f0f0f0",
    theme_color: "#533ff5",
    icons: [
      { src: "/brand/treidify-t-256.png", sizes: "256x256", type: "image/png" },
      { src: "/brand/treidify-t-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
