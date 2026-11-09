import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Mocked, jsdom-only UI acceptance tests; never launches a server, camera,
 * auth backend, real browser, or production API request.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src/", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: false,
    include: ["src/components/auth/AuthForm.dom.test.tsx"],
    mockReset: true,
    restoreMocks: true,
  },
});
