import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [sveltekit()],
  ssr: {
    noExternal: ["three"],
  },
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
    },
  },
  test: {
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/lib/engine/**/*.ts"],
      exclude: ["src/lib/engine/**/*.test.ts", "src/lib/engine/types/**"],
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80,
    },
  },
});
