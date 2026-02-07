import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./test/setup.ts"],
    include: ["**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "**/graphql/**",
        "node_modules/**",
        "**/*.config.*",
        "**/scripts/**",
        "**/test/**",
        "**/types/**",
        "global-env.d.ts",
        "bin.ts",
        "**/meta.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./"),
    },
  },
});
