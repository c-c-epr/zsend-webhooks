# ZSend Webhooks

ZSend Webhooks 是一個部署在 Cloudflare Workers 上的 webhook 接收端。它會接收 ZSend 傳來的 POST 請求，驗證 `x-zsend-signature` 與 `x-zsend-timestamp`，確認 payload 沒有被竄改後才回應成功。

## 功能

- 只接受 `POST` webhook 請求
- 使用 `SECRET_KEY` 驗證 HMAC SHA-256 簽章
- 支援 ZSend 測試事件：`X-ZSend-Event: test`
- 使用 Cloudflare Workers 執行
- 使用 Vitest 與 `@cloudflare/vitest-pool-workers` 測試 Worker 行為

## Zeabur 測試事件例外

目前程式中對 `X-ZSend-Event: test` 有一個暫時性的例外處理：只要收到這個事件，就會直接回應 `200 OK`，不會進入簽章驗證流程。

這是為了相容 Zeabur 目前的設計缺陷。Zeabur 會在提供 webhook secret 的瞬間，甚至在 endpoint 端有機會完成 `SECRET_KEY` 設定之前，就先送出 `test` 事件。此時接收端還來不及填入與 Zeabur 相同的 secret，因此測試事件無法通過一般的 `x-zsend-signature` 驗證流程。為了讓 Zeabur 的測試功能可以正常判定 endpoint 存活，才暫時讓 `test` 事件無論簽章狀態如何都回應成功。

等 Zeabur 官方修正測試 webhook 的簽章行為後，預計會移除這段 `test` 事件的例外處理，讓所有 webhook 請求都走一致的簽章驗證流程。

## 需求

- Node.js 22+
- npm
- Cloudflare 帳號與 Wrangler 登入狀態

## 安裝

```sh
npm ci
```

建立本機環境變數檔：

```sh
# macOS / Linux
cp .env.example .env

# Windows PowerShell
Copy-Item .env.example .env
```

接著設定 webhook 驗章用的 secret：

```env
SECRET_KEY=your_secret_key_here
```

## 本機開發

啟動 Cloudflare Workers 開發伺服器：

```sh
npm run dev
```

如果要使用專案內的 `start` script：

```sh
npm start
```

## 部署

先把 `SECRET_KEY` 設成 Cloudflare Workers secret：

```sh
npx wrangler secret put SECRET_KEY
```

部署 Worker：

```sh
npm run deploy
```

## Webhook 請求格式

Worker 會檢查以下 headers：

| Header              | 說明                                         |
| ------------------- | -------------------------------------------- |
| `x-zsend-event`     | ZSend 事件名稱；若為 `test` 會直接回應 `OK!` |
| `x-zsend-signature` | HMAC 簽章，格式為 `sha256=<hex_digest>`      |
| `x-zsend-timestamp` | 簽章使用的 timestamp                         |

Body 必須是合法 JSON。

簽章計算方式：

```ts
const message = `${timestamp}.${rawBody}`;
const digest = crypto.createHmac("sha256", secret).update(message).digest("hex");
const signature = `sha256=${digest}`;
```

注意：`rawBody` 必須是實際送出 request body 的原始字串；如果重新格式化 JSON，簽章會不同。

## 回應狀態

| 狀態碼 | 回應                                                | 情境                                   |
| ------ | --------------------------------------------------- | -------------------------------------- |
| `200`  | `OK!`                                               | 簽章正確，或收到 `X-ZSend-Event: test` |
| `400`  | `Missing signature or timestamp`                    | 缺少簽章或 timestamp                   |
| `400`  | `Invalid JSON`                                      | body 不是合法 JSON                     |
| `401`  | `Invalid signature`                                 | 簽章驗證失敗                           |
| `405`  | `Method Not Allowed`                                | 不是 `POST` 請求                       |
| `500`  | `Server configuration error: SECRET_KEY is not set` | Worker 未設定 `SECRET_KEY`             |

## 測試與檢查

```sh
npm run test:run
npm run typecheck
npm run format:check
npm run types:check
```

開發時也可以使用 watch 模式：

```sh
npm test
```

## 專案結構

```txt
src/_index.ts        Worker fetch 入口
src/router.ts        Webhook request 驗證與回應邏輯
test/index.spec.ts   Worker 單元與整合測試
wrangler.jsonc       Cloudflare Workers 設定
```
