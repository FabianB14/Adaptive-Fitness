import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// GitHub Pages serves the app from /<repo>/. Override with VITE_BASE_PATH
// when deploying elsewhere (e.g. "/" on DigitalOcean or a custom domain).
const base = process.env.VITE_BASE_PATH ?? "/Adaptive-Fitness/";

export default defineConfig({
  base,
  server: {
    fs: {
      // The shared vocabulary/exercise seed lives one level above the
      // frontend root and is imported directly.
      allow: [".."],
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Adaptive Fitness",
        short_name: "Adaptive",
        description:
          "Training and nutrition that adapt to your actual body — never shaming, always on your side.",
        start_url: base,
        scope: base,
        display: "standalone",
        orientation: "portrait",
        background_color: "#F1F3EF",
        theme_color: "#F1F3EF",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icon-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // iOS can evict PWA storage at any time; the cache is a convenience,
        // never the source of truth. Precache the shell, network-first for
        // everything else.
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallback: `${base}index.html`,
      },
    }),
  ],
});
