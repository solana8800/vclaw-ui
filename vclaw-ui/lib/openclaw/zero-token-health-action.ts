import type { GatewayHealthDiagnosis, GatewayVariant } from "@/lib/openclaw/zero-token-health";

export type GatewayReadinessSnapshot = {
  hasZeroTokenModels: boolean;
  hasUsableZeroTokenAuth: boolean;
  hasZeroTokenRuntimeModel: boolean;
  runtimeModelRef?: string;
  runtimeModelSource?: "defaults" | "recent";
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
  if (input.readiness?.hasUsableZeroTokenAuth === false) return "auth_unusable";
  if (input.readiness?.hasZeroTokenRuntimeModel === false) {
    return input.readiness.runtimeModelRef ? "runtime_not_web" : "runtime_unknown";
  }
  return null;
}
