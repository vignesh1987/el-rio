/**
 * Vite configuration.
 *
 * The game uses Preact (a 4 kB version of React). Vite compiles the JSX
 * in .tsx files with Preact's runtime, so no extra plugin is needed.
 */
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Relative asset paths, so the built site works from any folder or sub-path.
  base: "./",
  oxc: {
    jsx: { runtime: "automatic", importSource: "preact" },
  },
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
