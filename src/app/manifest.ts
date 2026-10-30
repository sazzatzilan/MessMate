import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const base = process.env.BASE_PATH || "";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MessMate",
    short_name: "MessMate",
    description: "Meals, bazar, and the mess bill for a hostel.",
    id: `${base}/`,
    start_url: `${base}/`,
    scope: `${base}/`,
    display: "standalone",
    background_color: "#f3f6f5",
    theme_color: "#0F766E",
    lang: "en",
    icons: [
      { src: `${base}/icons/icon-192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `${base}/icons/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: `${base}/icons/icon-maskable-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
