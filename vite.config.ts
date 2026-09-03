import { defineConfig } from "vite";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "svenjs",
  },
  optimizeDeps: {
    exclude: ["svenjs"],
  },
  server: {
    port: 5173,
  },
});
