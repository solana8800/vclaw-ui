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
  };
}): string {
  if (input.diagnosis === "unauthorized") {
    return `Gateway từ chối token tại ${input.baseUrl} (HTTP ${input.status}). Kiểm tra OPENCLAW_GATEWAY_TOKEN và NEXT_PUBLIC_OPENCLAW_GATEWAY_TOKEN.`;
  }
  if (input.diagnosis === "unreachable") {
    return `Không gọi được gateway tại ${input.baseUrl}. Kiểm tra tiến trình gateway, OPENCLAW_GATEWAY_URL và WS ${input.wsUrl}.`;
  }
  if (!input.authConfigured) {
    return `Chưa thấy token gateway trong env. REST ${input.baseUrl} có thể sống nhưng trình duyệt sẽ không authenticate được WS ${input.wsUrl}.`;
  }
  if (input.mode === "zero-token") {
    if (input.readiness?.hasZeroTokenModels === false) {
      return `Gateway Zero Token đang phản hồi tại ${input.baseUrl} nhưng chưa thấy catalog model web. Kiểm tra config provider/model của gateway.`;
    }
    if (input.readiness?.hasUsableZeroTokenAuth === false) {
      return `Gateway Zero Token đang phản hồi tại ${input.baseUrl} nhưng auth web chưa usable. Kiểm tra webauth và browser session của provider web.`;
    }
    if (input.readiness?.hasZeroTokenRuntimeModel === false) {
      if (input.readiness.runtimeModelRef) {
        return `Gateway Zero Token đang phản hồi tại ${input.baseUrl} nhưng runtime hiện tại là ${input.readiness.runtimeModelRef}${input.readiness.runtimeModelSource ? ` (${input.readiness.runtimeModelSource})` : ""}, chưa phải model web. Chuyển model mặc định hoặc session sang provider *-web/* trước khi chat.`;
      }
      return `Gateway Zero Token đang phản hồi tại ${input.baseUrl} nhưng chưa xác định được runtime model. Kiểm tra session status và model mặc định của gateway.`;
    }
    if (input.readiness?.runtimeModelRef) {
      return `Gateway Zero Token đang phản hồi tại ${input.baseUrl} và runtime web đang active: ${input.readiness.runtimeModelRef}.`;
    }
    return `Gateway Zero Token đang phản hồi tại ${input.baseUrl}. Nếu chat vẫn lỗi, kiểm tra webauth/browser session và model web đang active.`;
  }
  return `Gateway đang phản hồi tại ${input.baseUrl} nhưng chưa xác định rõ mode. Kiểm tra variant, model mặc định và WS ${input.wsUrl}.`;
}
