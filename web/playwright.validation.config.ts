import { defineConfig, devices } from "@playwright/test";

const host = "http://127.0.0.1:4179";

/**
 * Real Chromium, synthetic credentials only, no production authentication.
 * Run the imported UI's local Vite dev server on loopback, never 0.0.0.0.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "login.validation.spec.ts",
  timeout: 30_000,
  retries: 0,
  workers: 1,
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: host,
    headless: true,
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  webServer: {
    command: "npx --no-install vite --host 127.0.0.1 --port 4179 --strictPort",
    url: host + "/login.html",
    timeout: 60_000,
    reuseExistingServer: false,
    env: {
      VITE_GIT_COMMIT_HASH: "isolated-e2e",
    },
  },
});
