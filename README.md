# ZSend Webhooks

**Language:** English | [繁體中文](README.zh-TW.md)

ZSend Webhooks is a webhook receiver deployed on Cloudflare Workers. It accepts `POST` requests from ZSend, verifies `x-zsend-signature` and `x-zsend-timestamp`, and returns success only after confirming that the payload has not been tampered with.

## Features

- Accepts only `POST` webhook requests
- Verifies HMAC SHA-256 signatures with `ZSEND_WEBHOOKS_SECRET`
- Supports the ZSend test event: `X-ZSend-Event: test`
- Runs on Cloudflare Workers
- Tests Worker behavior with Vitest and `@cloudflare/vitest-pool-workers`

## Zeabur Test Event Exception

The current implementation has a temporary exception for `X-ZSend-Event: test`: whenever this event is received, the Worker returns `200 OK` directly without running signature verification.

This exists to work around a current Zeabur behavior. Zeabur sends the `test` event immediately after a webhook secret is provided, potentially before the endpoint has had a chance to finish configuring the matching `ZSEND_WEBHOOKS_SECRET`. At that moment, the receiver may not yet have the same secret as Zeabur, so the test event cannot pass the normal `x-zsend-signature` verification flow. The exception lets Zeabur correctly detect that the endpoint is alive.

After Zeabur fixes the test webhook signature behavior, this exception is expected to be removed so every webhook request goes through the same signature verification flow.

## Requirements

- Node.js 22+
- npm
- A Cloudflare account with Wrangler logged in

## Installation

```sh
npm ci
```

Create a local environment file:

```sh
# macOS / Linux
cp .env.example .env

# Windows PowerShell
Copy-Item .env.example .env
```

Then set the secret used for webhook signature verification:

```env
ZSEND_WEBHOOKS_SECRET=your_secret_key_here
```

## Local Development

Start the Cloudflare Workers development server:

```sh
npm run dev
```

To use the project `start` script:

```sh
npm start
```

## Deployment

First, store `ZSEND_WEBHOOKS_SECRET` as a Cloudflare Workers secret:

```sh
npx wrangler secret put ZSEND_WEBHOOKS_SECRET
```

Deploy the Worker:

```sh
npm run deploy
```

## Webhook Request Format

The Worker checks the following headers:

| Header              | Description                                                |
| ------------------- | ---------------------------------------------------------- |
| `x-zsend-event`     | ZSend event name; `test` currently returns `OK!` directly  |
| `x-zsend-signature` | HMAC signature in the format `sha256=<hex_digest>`         |
| `x-zsend-timestamp` | Timestamp used to build the signature verification message |

The request body must be valid JSON.

Signature verification uses this message format:

```ts
const message = `${timestamp}.${rawBody}`;
const digest = await hmacSha256Hex(secret, message);
const signature = `sha256=${digest}`;
```

Note: `rawBody` must be the exact raw string sent as the request body. Reformatting JSON will produce a different signature.

## Responses

| Status | Body                                                           | Scenario                                             |
| ------ | -------------------------------------------------------------- | ---------------------------------------------------- |
| `200`  | `OK!`                                                          | Valid signature, or `X-ZSend-Event: test` is present |
| `400`  | `Missing signature or timestamp`                               | Missing signature or timestamp                       |
| `400`  | `Invalid JSON`                                                 | Body is not valid JSON                               |
| `401`  | `Invalid signature`                                            | Signature verification failed                        |
| `405`  | `Method Not Allowed`                                           | Request method is not `POST`                         |
| `500`  | `Server configuration error: ZSEND_WEBHOOKS_SECRET is not set` | Worker is missing `ZSEND_WEBHOOKS_SECRET`            |

## Tests and Checks

```sh
npm run test:run
npm run typecheck
npm run format:check
npm run types:check
```

During development, you can also use watch mode:

```sh
npm test
```

## Project Structure

```txt
src/_index.ts        Worker fetch entry point
src/router.ts        Webhook request validation and response logic
src/unit/hmac.ts     HMAC SHA-256 helper
test/index.spec.ts   Worker unit and integration tests
wrangler.jsonc       Cloudflare Workers configuration
```
