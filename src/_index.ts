import { router } from './router';

export default {
  async fetch(request, env, ctx): Promise<Response> {
    return await router(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
