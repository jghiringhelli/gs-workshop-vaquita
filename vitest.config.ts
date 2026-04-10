import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    env: {
      NODE_ENV: "test",
      JWT_SECRET: "vitest-test-secret-do-not-use-in-production",
      MAX_PARTICIPANTS: "20",
      MIN_PARTICIPANTS: "3",
      CONTRIBUTION_WINDOW_DAYS: "7",
      LATE_WINDOW_DAYS: "14",
      PENALTY_RATE: "0.05",
    },
    include: ["src/**/*.test.ts", "src/**/*.spec.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/**/*.spec.ts", "src/index.ts"],
    },
  },
});
