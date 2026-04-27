import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';
import { TEST_SECRET_KEY } from './test/constants';

process.env.SECRET_KEY ??= TEST_SECRET_KEY;

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.jsonc' },
        miniflare: {
          bindings: {
            SECRET_KEY: TEST_SECRET_KEY,
          },
        },
      },
    },
  },
});
