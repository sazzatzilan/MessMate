import type { NextConfig } from "next";

// Empty when the site is served from the domain root.
// GitHub Pages publishes this repo at /messmate, so that build sets BASE_PATH.
const basePath = process.env.BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
