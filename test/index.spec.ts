import { env, createExecutionContext, waitOnExecutionContext, SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { hmacSha256Hex } from "../src/unit/hmac";
import worker from "../src/_index";
import { TEST_ZSEND_WEBHOOKS_SECRET } from "./constants";

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

const timestamp = "1710000000";
const payload = { id: "evt_123", status: "paid" };
const rawBody = JSON.stringify(payload);

async function signatureFor(secret: string, body = rawBody) {
  const digest = await hmacSha256Hex(secret, `${timestamp}.${body}`);

  return `sha256=${digest}`;
}

async function signedRequest(body = rawBody, signature?: string) {
  return new IncomingRequest("http://example.com/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-zsend-event": "payment.succeeded",
      "x-zsend-signature": signature ?? (await signatureFor(TEST_ZSEND_WEBHOOKS_SECRET, body)),
      "x-zsend-timestamp": timestamp,
    },
    body,
  });
}

describe("ZSend webhook worker", () => {
  it("rejects non-POST requests", async () => {
    const request = new IncomingRequest("http://example.com/webhook");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(405);
    expect(await response.text()).toBe("Method Not Allowed");
  });

  it("rejects requests when ZSEND_WEBHOOKS_SECRET is not configured", async () => {
    const request = await signedRequest();
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, { ...env, ZSEND_WEBHOOKS_SECRET: "" }, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(500);
    expect(await response.text()).toBe("Server configuration error: ZSEND_WEBHOOKS_SECRET is not set");
  });

  it("rejects requests missing signature headers", async () => {
    const request = new IncomingRequest("http://example.com/webhook", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: rawBody,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Missing signature or timestamp");
  });

  it("rejects invalid JSON bodies", async () => {
    const request = await signedRequest("{bad json}", await signatureFor(TEST_ZSEND_WEBHOOKS_SECRET, "{bad json}"));
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Invalid JSON");
  });

  it("rejects requests with invalid signatures", async () => {
    const request = await signedRequest(rawBody, "invalid-signature");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(401);
    expect(await response.text()).toBe("Invalid signature");
  });

  it("accepts valid signed webhook requests in unit style", async () => {
    const request = await signedRequest();
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("OK!");
  });

  it("accepts valid signed webhook requests in integration style", async () => {
    const request = await signedRequest();
    const response = await SELF.fetch("https://example.com/webhook", {
      method: "POST",
      headers: request.headers,
      body: rawBody,
    });

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("OK!");
  });
});
