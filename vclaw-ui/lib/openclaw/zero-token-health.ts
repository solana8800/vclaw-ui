export type GatewayVariant = "zero-token" | "upstream" | "unknown";

export type GatewayHealthDiagnosis =
  | "ok"
  | "unauthorized"
  | "unreachable"
  | "http_error";

export type GatewayHealthSummary = {
  ok: boolean;
  status: number;
  baseUrl: string;
  wsUrl: string;
  authConfigured: boolean;
  mode: GatewayVariant;
  diagnosis: GatewayHealthDiagnosis;
  error?: string;
};

function normalizeGatewayVariant(variant?: string | null): GatewayVariant {
  const value = variant?.trim().toLowerCase();
  if (value === "zero-token") return "zero-token";
  if (value === "upstream") return "upstream";
  return "unknown";
}

export function classifyGatewayHealthResponse(input: {
  status: number;
  baseUrl: string;
  wsUrl: string;
  authConfigured: boolean;
  gatewayVariant?: string | null;
}): GatewayHealthSummary {
  const mode = normalizeGatewayVariant(input.gatewayVariant);
  if (input.status === 401 || input.status === 403) {
    return {
      ok: false,
      status: input.status,
      baseUrl: input.baseUrl,
      wsUrl: input.wsUrl,
      authConfigured: input.authConfigured,
      mode,
      diagnosis: "unauthorized",
    };
  }

  return {
    ok: input.status >= 200 && input.status < 300,
    status: input.status,
    baseUrl: input.baseUrl,
    wsUrl: input.wsUrl,
    authConfigured: input.authConfigured,
    mode,
    diagnosis: input.status >= 200 && input.status < 300 ? "ok" : "http_error",
  };
}

export function classifyGatewayHealthFailure(input: {
  baseUrl: string;
  wsUrl: string;
  authConfigured: boolean;
  gatewayVariant?: string | null;
  error?: string;
}): GatewayHealthSummary {
  return {
    ok: false,
    status: 0,
    baseUrl: input.baseUrl,
    wsUrl: input.wsUrl,
    authConfigured: input.authConfigured,
    mode: normalizeGatewayVariant(input.gatewayVariant),
    diagnosis: "unreachable",
    error: input.error || "unreachable",
  };
}
