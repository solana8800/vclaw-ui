/**
 * Tên biến thống nhất với `resources/openclaw.default.json` → `env.vars.OPENCLAW_GATEWAY_TOKEN`.
 * Fallback tên cũ `OPENCLAW_GATEWAY_*` để cấu hình đã deploy vẫn chạy.
 */

/** Token gửi kèm WebSocket / UI client — bắt buộc tiền tố NEXT_PUBLIC_ để trình duyệt đọc được */
export function getPublicGatewayAuthToken(): string {
  return (
    process.env.NEXT_PUBLIC_OPENCLAW_GATEWAY_TOKEN?.trim() ||
    ""
  );
}

/** Lấy token cho Server-side (Proxy). Ưu tiên biến Private, fallback về Public nếu cần. */
export function getGatewayAuthToken(): string | undefined {
  return (
    process.env.OPENCLAW_GATEWAY_TOKEN?.trim() ||
    getPublicGatewayAuthToken() ||
    undefined
  );
}
