import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";
import { TEST_ZSEND_WEBHOOKS_SECRET } from "./test/constants";

process.env.ZSEND_WEBHOOKS_SECRET ??= TEST_ZSEND_WEBHOOKS_SECRET;

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        bindings: {
          ZSEND_WEBHOOKS_SECRET: TEST_ZSEND_WEBHOOKS_SECRET,
        },
      },
    }),
  ],
});
