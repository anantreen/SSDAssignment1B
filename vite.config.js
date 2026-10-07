/**
 * Vite development/build configuration.
 *
 * Serve the existing web/ entry directory and proxy /api to the Express listener.
 * Production assets go to dist/, which api/app.js serves and submission packaging
 * excludes.
 */

import { defineConfig } from "vite";
export default defineConfig({
  root: "web",
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: { "/api": "http://127.0.0.1:3000" },
  },
  build: { outDir: "../dist", emptyOutDir: true },
});
