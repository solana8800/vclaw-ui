import type { GatewayHealthDiagnosis, GatewayVariant } from "@/lib/openclaw/zero-token-health";

export type GatewayReadinessSnapshot = {
  hasZeroTokenModels: boolean;
  hasUsableZeroTokenAuth: boolean;
  hasZeroTokenRuntimeModel: boolean;
  runtimeModelRef?: string;
  runtimeModelSource?: "defaults" | "recent";
  authProviders?: Array<{ provider: string; displayName: string; status: string }>;
};

export type GatewayHealthActionReason =
  | "missing_token"
  | "unauthorized"
  | "unreachable"
  | "missing_catalog"
  | "auth_unusable"
  | "runtime_not_web"
  | "runtime_unknown";

export function resolveGatewayHealthAction(input: {
  diagnosis: GatewayHealthDiagnosis;
  mode: GatewayVariant;
  authConfigured: boolean;
  readiness?: GatewayReadinessSnapshot;
}): GatewayHealthActionReason | null {
  if (input.diagnosis === "unauthorized") return "unauthorized";
  if (input.diagnosis === "unreachable") return "unreachable";
  if (!input.authConfigured) return "missing_token";
  if (input.mode !== "zero-token") return null;
  if (input.readiness?.hasZeroTokenModels === false) return "missing_catalog";
  if (
    input.readiness?.hasUsableZeroTokenAuth === false &&
    input.readiness.authProviders &&
    input.readiness.authProviders.length > 0
  ) {
    return "auth_unusable";
  }
  if (input.readiness?.hasZeroTokenRuntimeModel === false) {
    if (input.readiness.runtimeModelRef) return "runtime_not_web";
    return null;
  }
  return null;
}
