import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      // server-only throws outside an RSC bundler; stub it so server modules
      // (db, prisma, auth) can be imported in the node test environment.
      "server-only": resolve(__dirname, "tests/stubs/server-only.ts"),
    },
  },
  test: { environment: "node" },
});
