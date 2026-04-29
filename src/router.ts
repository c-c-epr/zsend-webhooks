import { hmacSha256Hex } from "./unit/hmac";

export async function router(request: Request, env: Env, ctx: ExecutionContext) {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // 此例外應該在 Zeabur 修復 Bug 後移除，請參考 README.md 中的說明
  // This exception should be removed after Zeabur fixes the bug, please refer to the README.md for details
  if (request.headers.get("X-ZSend-Event") === "test") {
    console.log("[TEST] Skip signature verification due to Zeabur bug");
    return new Response("OK!");
  }

  const secret = env.ZSEND_WEBHOOKS_SECRET;
  if (!secret) {
    return new Response("Server configuration error: ZSEND_WEBHOOKS_SECRET is not set", { status: 500 });
  }

  const signature = request.headers.get("x-zsend-signature") as string | null;
  const timestamp = request.headers.get("x-zsend-timestamp") as string | null;

  if (!signature || !timestamp) {
    return new Response("Missing signature or timestamp", { status: 400 });
  }

  let body = {};
  let rawBody = "";

  try {
    const clone = request.clone();
    body = await clone.json();
    rawBody = await request.text();
  } catch (e) {
    console.error("Failed JSON", { error: e, rawBody });
    return new Response("Invalid JSON", { status: 400 });
  }

  const message = `${timestamp}.${rawBody}`;
  const expectedSignature = await hmacSha256Hex(secret, message);

  if (signature !== `sha256=${expectedSignature}`) {
    return new Response("Invalid signature", { status: 401 });
  }

  // 非同步執行
  ctx.waitUntil(
    (async () => {
      // 在這裡可以做一些背景工作
      // You can do some work in the background here
      console.log(`[${request.headers.get("X-ZSend-Event")?.toUpperCase() ?? "UNKNOWN"}]`, body);
    })(),
  );
  //  回傳成功
  return new Response("OK!");
}
