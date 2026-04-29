import { zsendWebhookVerify } from "./zsend-webhook-verify";

export async function router(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const path = new URL(request.url).pathname;

  switch (path) {
    case "/webhooks/zsend":
      return await zsendWebhookVerify(request, env, ctx);
    default:
      return new Response("Not Found", { status: 404 });
  }
}
