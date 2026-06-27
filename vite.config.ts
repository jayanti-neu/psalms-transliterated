import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const BASE = "/psalms-transliterated/";

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "icon-maskable.svg"],
      manifest: {
        name: "Tehilim Reader",
        short_name: "Tehilim",
        description: "Read the Psalms in Hebrew with transliteration, translation, and commentary.",
        lang: "en",
        theme_color: "#16352f",
        background_color: "#f4f1e9",
        display: "standalone",
        scope: BASE,
        start_url: BASE,
        icons: [
          { src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
          { src: "icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
        ],
      },
      workbox: {
        // Precache only the small app shell; large data files and the Sefaria
        // API are cached on demand below so nothing heavy downloads upfront.
        globPatterns: ["**/*.{js,css,html}"],
        navigateFallback: "index.html",
        runtimeCaching: [
          {
            // Bundled Hebrew + commentary JSON: download once, refresh monthly.
            urlPattern: ({ url }) => url.pathname.startsWith(BASE) && url.pathname.endsWith(".json"),
            handler: "CacheFirst",
            options: {
              cacheName: "tehilim-data",
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Sefaria English/lexicon: serve instantly from cache, refresh in
            // the background — so visited psalms are fast and work offline.
            urlPattern: ({ url }) => url.origin === "https://www.sefaria.org",
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "sefaria-api",
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
