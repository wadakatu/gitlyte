import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    globals: true,
    environment: "node",
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 5000,
    env: {
      NODE_ENV: "test",
    },
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/types.ts"],
    },
  },
});
