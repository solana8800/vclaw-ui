# Zero Token Verification Matrix

Mục tiêu: xác minh VClaw chạy đúng với cả gateway OpenClaw thường và submodule `core/openclaw-zero-token`, đồng thời tách được lỗi ở các lớp `REST`, `WS`, `auth token`, `webauth`, và `catalog/auth provider web`.

## 1. Unit / route regression

Run:

```bash
cd vclaw-ui
pnpm vitest run \
  lib/gateway/env.test.ts \
  lib/openclaw/zero-token-health.test.ts \
  lib/openclaw/zero-token-health-message.test.ts \
  lib/openclaw/zero-token-model-detection.test.ts \
  app/api/openclaw-health/route.test.ts \
  components/admin/openclaw-zero-token-status.test.tsx
```

Expected:

- Tất cả pass.
- `route.test.ts` xác nhận:
  - health chi tiết khi gateway phản hồi
  - `unauthorized` khi token sai
  - fallback sạch khi readiness RPC lỗi

## 1.1. Opt-in REST + WS smoke

Run trong môi trường được phép bind local port:

```bash
cd vclaw-ui
OPENCLAW_NETWORK_SMOKE=1 pnpm vitest run app/api/openclaw-health/route.integration.test.ts
```

Expected:

- mock gateway REST `/health` nhận `X-Gateway-Token`
- mock gateway WS chạy handshake `connect.challenge` → `connect`
- `/api/openclaw-health` đọc được `status`, `models.list`, `models.authStatus`
- readiness trả `hasZeroTokenModels`, `hasUsableZeroTokenAuth`, `hasZeroTokenRuntimeModel` đều `true`

## 2. Targeted lint

Run:

```bash
cd vclaw-ui
pnpm exec eslint \
  lib/gateway/env.ts \
  lib/gateway/env.test.ts \
  lib/openclaw/zero-token-health.ts \
  lib/openclaw/zero-token-health-message.ts \
  lib/openclaw/zero-token-model-detection.ts \
  app/api/openclaw-health/route.ts \
  app/api/openclaw-health/route.test.ts \
  components/admin/openclaw-zero-token-status.tsx \
  components/admin/openclaw-zero-token-status.test.tsx
```

Expected:

- Không có error.

## 3. Upstream gateway baseline

Env gợi ý:

```bash
OPENCLAW_GATEWAY_URL=http://127.0.0.1:18789
OPENCLAW_GATEWAY_VARIANT=upstream
OPENCLAW_GATEWAY_TOKEN=<token-that-matches-gateway>
NEXT_PUBLIC_OPENCLAW_GATEWAY_TOKEN=<same-token>
```

Checks:

1. `GET /api/openclaw-health`
2. Mở một trang admin có `AdminPageView`
3. Mở card `OpenClaw / Zero Token`

Expected:

- `mode: upstream`
- `diagnosis: ok`
- card không báo sai token hoặc unreachable
- readiness có thể rỗng nếu gateway không trả provider `*-web`

## 4. Zero Token healthy path

Chuẩn bị submodule:

```bash
git submodule update --init --recursive core/openclaw-zero-token
cd core/openclaw-zero-token
pnpm install
pnpm build
pnpm ui:build
./start-chrome-debug.sh
./onboard.sh webauth
./server.sh
```

Env gợi ý:

```bash
OPENCLAW_GATEWAY_URL=http://127.0.0.1:3001
OPENCLAW_GATEWAY_VARIANT=zero-token
OPENCLAW_GATEWAY_TOKEN=<gateway.auth.token trong core/openclaw-zero-token/.openclaw-upstream-state/openclaw.json>
NEXT_PUBLIC_OPENCLAW_GATEWAY_TOKEN=<same-token>
NEXT_PUBLIC_OPENCLAW_GATEWAY_WS_URL=ws://127.0.0.1:3001/ws
VCLAW_GATEWAY_DEVICE_IDENTITY_PATH=~/.vclaw/gateway-device-identity.json
```

Checks:

1. `GET /api/openclaw-health`
2. Card `OpenClaw / Zero Token`
3. AI chat admin

Expected:

- `mode: zero-token`
- `diagnosis: ok`
- `authConfigured: true`
- WS readiness không bị mất scope `operator.read` vì VClaw ký `connect.challenge` bằng device identity
- readiness cho thấy:
  - `hasZeroTokenModels: true`
  - `hasUsableZeroTokenAuth: true` hoặc ít nhất có `authProviders`
  - `hasZeroTokenRuntimeModel: true` khi status RPC trả session/default model dạng `*-web/*`
- card hiển thị:
  - REST URL đúng
  - WS URL đúng
  - model catalog web có ít nhất một `provider/model`
  - runtime model dạng `provider/model` nếu gateway trả được status

## 5. Wrong token

Env:

```bash
OPENCLAW_GATEWAY_TOKEN=wrong-token
NEXT_PUBLIC_OPENCLAW_GATEWAY_TOKEN=wrong-token
```

Expected:

- `/api/openclaw-health` trả `diagnosis: unauthorized`
- card hiện `Sai token / bị từ chối`
- AI chat banner cũng nêu lỗi token

## 6. Wrong WS URL

Env:

```bash
NEXT_PUBLIC_OPENCLAW_GATEWAY_WS_URL=ws://127.0.0.1:3999/ws
```

Expected:

- `/api/openclaw-health` vẫn có thể `ok` nếu REST đúng
- card hiển thị WS URL sai rõ ràng
- AI chat fail ở lớp WS dù health REST còn xanh

## 7. Gateway down / unreachable

Expected:

- `/api/openclaw-health` trả `diagnosis: unreachable`
- card hiện `Không kết nối được`
- không có readiness

## 8. Webauth chưa chạy hoặc session web hết hạn

Expected:

- `/api/openclaw-health` có thể vẫn `ok`
- readiness có thể cho thấy catalog web tồn tại nhưng auth provider web không usable
- card hiển thị provider web với status như `expired` / không usable
- AI chat thực tế không sinh được phản hồi model web

## 9. Điều chưa xác minh tự động

Card hiện đọc runtime model qua WS `status` khi gateway expose contract đó. Matrix này vẫn chưa tự động xác minh provider web thực sự trả lời prompt end-to-end nếu session trình duyệt hết hạn sau health check.

Card hiện xác minh:

- gateway mode
- REST/WS reachability
- token configured
- catalog `*-web`
- auth status của provider web
- runtime/default model `*-web/*` nếu status RPC có dữ liệu
