import { defineConfig } from "vitest/config";

/**
 * Camera-free, credential-free schema compatibility tests.
 * Deliberately avoids the imported legacy Vite config's missing UI test setup.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: [
      "src/lib/validation/authSchemas.test.ts",
      "src/lib/validation/numericSchemas.test.ts",
      "src/lib/validation/maskSchemas.test.ts",
    ],
    globals: false,
  },
});
