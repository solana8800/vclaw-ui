import type { GatewayHealthDiagnosis, GatewayVariant } from "@/lib/openclaw/zero-token-health";

export function formatGatewayHealthMessage(input: {
  diagnosis: GatewayHealthDiagnosis;
  baseUrl: string;
  wsUrl: string;
  mode: GatewayVariant;
  authConfigured: boolean;
  status: number;
  readiness?: {
    hasZeroTokenModels: boolean;
    hasUsableZeroTokenAuth: boolean;
    hasZeroTokenRuntimeModel: boolean;
    runtimeModelRef?: string;
    runtimeModelSource?: "defaults" | "recent";
    authProviders?: Array<{ provider: string; displayName: string; status: string }>;
  };
}): string {
  if (input.diagnosis === "unauthorized") {
    return `Gateway từ chối token tại ${input.baseUrl} (HTTP ${input.status}). Kiểm tra OPENCLAW_GATEWAY_TOKEN và NEXT_PUBLIC_OPENCLAW_GATEWAY_TOKEN.`;
  }
  if (input.diagnosis === "unreachable") {
    return `Không gọi được gateway tại ${input.baseUrl}. Vui lòng kiểm tra lại dịch vụ chạy ngầm.`;
  }
  if (!input.authConfigured) {
    return `Chưa thấy token gateway. Vui lòng cấu hình token cho VClaw và Gateway.`;
  }
  if (input.mode === "zero-token") {
    if (input.readiness?.hasZeroTokenModels === false) {
      return `Hệ thống đã kết nối nhưng chưa tìm thấy model web phù hợp.`;
    }
    if (
      input.readiness?.hasUsableZeroTokenAuth === false &&
      input.readiness.authProviders &&
      input.readiness.authProviders.length > 0
    ) {
      return `Hệ thống đã kết nối nhưng chưa xác thực WebAuth thành công. Vui lòng kích hoạt WebAuth.`;
    }
    if (input.readiness?.hasZeroTokenRuntimeModel === false) {
      if (input.readiness.runtimeModelRef) {
        return `Model hiện tại đang không tương thích, runtime hiện tại là ${input.readiness.runtimeModelRef}. Vui lòng đổi sang các model web.`;
      }
    }
    if (input.readiness?.runtimeModelRef) {
      return `VClaw Token đã kết nối thành công, runtime web đang active.`;
    }
    return `Gateway Zero Token đang phản hồi.`;
  }
  return `Hệ thống Gateway đã kết nối nhưng chưa xác định được cấu hình.`;
}
