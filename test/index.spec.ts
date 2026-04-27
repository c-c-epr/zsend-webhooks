import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import worker from '../src/_index';
import { TEST_SECRET_KEY } from './constants';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

const timestamp = '1710000000';
const payload = { id: 'evt_123', status: 'paid' };
const rawBody = JSON.stringify(payload);

function signatureFor(secret: string, body = rawBody) {
  const digest = crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  return `sha256=${digest}`;
}

function signedRequest(body = rawBody, signature = signatureFor(TEST_SECRET_KEY, body)) {
  return new IncomingRequest('http://example.com/webhook', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-zsend-event': 'payment.succeeded',
      'x-zsend-signature': signature,
      'x-zsend-timestamp': timestamp,
    },
    body,
  });
}

describe('ZSend webhook worker', () => {
  it('rejects non-POST requests', async () => {
    const request = new IncomingRequest('http://example.com/webhook');
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(405);
    expect(await response.text()).toBe('Method Not Allowed');
  });

  it('rejects requests when SECRET_KEY is not configured', async () => {
    const request = signedRequest();
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, { ...env, SECRET_KEY: '' }, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(500);
    expect(await response.text()).toBe('Server configuration error: SECRET_KEY is not set');
  });

  it('rejects requests missing signature headers', async () => {
    const request = new IncomingRequest('http://example.com/webhook', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: rawBody,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(400);
    expect(await response.text()).toBe('Missing signature or timestamp');
  });

  it('rejects invalid JSON bodies', async () => {
    const request = signedRequest('{bad json}', signatureFor(TEST_SECRET_KEY, '{bad json}'));
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(400);
    expect(await response.text()).toBe('Invalid JSON');
  });

  it('rejects requests with invalid signatures', async () => {
    const request = signedRequest(rawBody, 'invalid-signature');
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(401);
    expect(await response.text()).toBe('Invalid signature');
  });

  it('accepts valid signed webhook requests in unit style', async () => {
    const request = signedRequest();
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('OK!');
  });

  it('accepts valid signed webhook requests in integration style', async () => {
    const response = await SELF.fetch('https://example.com/webhook', {
      method: 'POST',
      headers: signedRequest().headers,
      body: rawBody,
    });

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('OK!');
  });
});
