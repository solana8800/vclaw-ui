/**
 * Tên biến thống nhất với `resources/openclaw.default.json` → `env.vars.OPENCLAW_GATEWAY_TOKEN`.
 * Fallback tên cũ `OPENCLAW_GATEWAY_*` để cấu hình đã deploy vẫn chạy.
 */

export function getGatewayAuthToken(): string | undefined {
  const v =
    process.env.OPENCLAW_GATEWAY_TOKEN?.trim();
  return v || undefined;
}

/** Token gửi kèp WebSocket / UI client — bắt buộc tiền tố NEXT_PUBLIC_ */
export function getPublicGatewayAuthToken(): string {
  return (
    process.env.NEXT_PUBLIC_OPENCLAW_GATEWAY_TOKEN?.trim() ||
    ""
  );
}
