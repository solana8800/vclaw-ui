import type { GatewayHealthDiagnosis, GatewayVariant } from "@/lib/openclaw/zero-token-health";
import type { GatewayHealthMessages } from "@/lib/admin/content";

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
  messages: GatewayHealthMessages;
}): string {
  const { messages } = input;
  if (input.diagnosis === "unauthorized") {
    return messages.unauthorized
      .replace("{url}", input.baseUrl)
      .replace("{status}", String(input.status));
  }
  if (input.diagnosis === "unreachable") {
    return messages.unreachable.replace("{url}", input.baseUrl);
  }
  if (!input.authConfigured) {
    return messages.missingToken;
  }
  if (input.mode === "zero-token") {
    if (input.readiness?.hasZeroTokenModels === false) {
      return messages.noWebModels;
    }
    if (
      input.readiness?.hasUsableZeroTokenAuth === false &&
      input.readiness.authProviders &&
      input.readiness.authProviders.length > 0
    ) {
      return messages.noWebAuth;
    }
    if (input.readiness?.hasZeroTokenRuntimeModel === false) {
      if (input.readiness.runtimeModelRef) {
        return messages.incompatibleModel.replace("{model}", input.readiness.runtimeModelRef);
      }
    }
    if (input.readiness?.runtimeModelRef) {
      return messages.connected;
    }
    return messages.responding;
  }
  return messages.unknownConfig;
}
