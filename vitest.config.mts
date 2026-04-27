import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';
import { TEST_SECRET_KEY } from './test/constants';

process.env.SECRET_KEY ??= TEST_SECRET_KEY;

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.jsonc' },
      miniflare: {
        bindings: {
          SECRET_KEY: TEST_SECRET_KEY,
        },
      },
    }),
  ],
});
