import { defineConfig } from "vitest/config";
import path from "path";
import react from "@vitejs/plugin-react";

/**
 * Component tests only. E2E lives in ./e2e and is driven by Playwright against the real API —
 * excluded here so `vitest run` never tries to execute it.
 *
 * Tailwind is deliberately not loaded: these tests assert behaviour and accessible names, never
 * computed styles, so the CSS pipeline is pure overhead.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "dist", "e2e"],
    restoreMocks: true,
  },
});
