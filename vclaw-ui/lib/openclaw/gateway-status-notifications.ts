export type GatewayConnectionSnapshot = {
  diagnosis?: string;
  authConfigured?: boolean;
} | null;

export type GatewayConnectionState = "unknown" | "success" | "error";

export type GatewayStatusTransition = "recovered" | "degraded";

export function getGatewayConnectionState(
  snapshot: GatewayConnectionSnapshot,
): GatewayConnectionState {
  if (!snapshot) return "unknown";
  return snapshot.diagnosis === "ok" && snapshot.authConfigured === true
    ? "success"
    : "error";
}

export function getGatewayStatusTransition(
  previousState: GatewayConnectionState | null,
  nextState: GatewayConnectionState,
): GatewayStatusTransition | null {
  if (!previousState) return null;
  if (previousState === nextState) return null;

  if (previousState === "success" && nextState === "error") {
    return "degraded";
  }

  if (previousState === "error" && nextState === "success") {
    return "recovered";
  }

  return null;
}
