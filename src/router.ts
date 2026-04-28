import crypto from "crypto";

export async function router(request: Request, env: Env, ctx: ExecutionContext) {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  //////////////////////////////////////////////
  //此段應該在 Zeabur 修復 Bug 後移除
  console.log(request.headers.get("X-ZSend-Event"));
  if (request.headers.get("X-ZSend-Event") === "test") {
    return new Response("OK!");
  }
  //////////////////////////////////////////////

  const secret = env.SECRET_KEY;
  if (!secret) {
    return new Response("Server configuration error: SECRET_KEY is not set", { status: 500 });
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
  const expectedSignature = crypto.createHmac("sha256", secret).update(message).digest("hex");

  if (signature !== `sha256=${expectedSignature}`) {
    return new Response("Invalid signature", { status: 401 });
  }

  // 非同步執行
  ctx.waitUntil(
    (async () => {
      // console.log('Doing some work in the background...');
    })(),
  );
  //  回傳成功
  return new Response("OK!");
}
