type ModelCatalogEntry = {
  provider?: unknown;
  id?: unknown;
  name?: unknown;
};

type ModelAuthProviderEntry = {
  provider?: unknown;
  displayName?: unknown;
  status?: unknown;
};

type GatewaySessionStatusEntry = {
  modelProvider?: unknown;
  model?: unknown;
};

type GatewayStatusPayload = {
  sessions?: {
    defaults?: {
      provider?: unknown;
      model?: unknown;
    };
    recent?: unknown[];
  };
};

function isZeroTokenProvider(provider: string): boolean {
  return provider.endsWith("-web");
}

function normalizeModelRef(provider: unknown, model: unknown): { provider: string; model: string } | null {
  const providerValue = typeof provider === "string" ? provider.trim() : "";
  const modelValue = typeof model === "string" ? model.trim() : "";
  if (!providerValue || !modelValue) return null;
  return {
    provider: providerValue,
    model: modelValue,
  };
}

export function summarizeGatewayModelCatalog(payload: { models?: unknown[] } | null | undefined) {
  const models = Array.isArray(payload?.models) ? payload.models : [];
  const zeroTokenProviders = new Set<string>();
  const sampleModels: string[] = [];

  for (const row of models) {
    if (!row || typeof row !== "object") continue;
    const entry = row as ModelCatalogEntry;
    const provider = typeof entry.provider === "string" ? entry.provider.trim() : "";
    const id = typeof entry.id === "string" ? entry.id.trim() : "";
    if (!provider || !id || !isZeroTokenProvider(provider)) continue;
    zeroTokenProviders.add(provider);
    if (sampleModels.length < 3) sampleModels.push(`${provider}/${id}`);
  }

  return {
    totalModels: models.length,
    zeroTokenProviders: Array.from(zeroTokenProviders).sort((a, b) => a.localeCompare(b)),
    sampleModels,
    hasZeroTokenModels: zeroTokenProviders.size > 0,
  };
}

export function summarizeGatewayModelAuthStatus(
  payload: { providers?: unknown[] } | null | undefined,
) {
  const providers = Array.isArray(payload?.providers) ? payload.providers : [];
  const zeroTokenProviders: Array<{ provider: string; displayName: string; status: string }> = [];

  for (const row of providers) {
    if (!row || typeof row !== "object") continue;
    const entry = row as ModelAuthProviderEntry;
    const provider = typeof entry.provider === "string" ? entry.provider.trim() : "";
    if (!provider || !isZeroTokenProvider(provider)) continue;
    const displayName =
      typeof entry.displayName === "string" && entry.displayName.trim()
        ? entry.displayName.trim()
        : provider;
    const status = typeof entry.status === "string" ? entry.status.trim() : "unknown";
    zeroTokenProviders.push({ provider, displayName, status });
  }

  return {
    totalProviders: providers.length,
    hasUsableZeroTokenAuth: zeroTokenProviders.some((row) =>
      row.status === "ok" || row.status === "expiring" || row.status === "static",
    ),
    zeroTokenProviders,
  };
}

export function summarizeGatewayRuntimeModelStatus(payload: GatewayStatusPayload | null | undefined) {
  const defaults = normalizeModelRef(payload?.sessions?.defaults?.provider, payload?.sessions?.defaults?.model);
  const recentRows = Array.isArray(payload?.sessions?.recent) ? payload?.sessions?.recent : [];
  const recentModels = recentRows
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const entry = row as GatewaySessionStatusEntry;
      return normalizeModelRef(entry.modelProvider, entry.model);
    })
    .filter((row): row is { provider: string; model: string } => row !== null);
  const recent = recentModels[0];
  const zeroTokenRuntime = [...recentModels, defaults].find(
    (row) => row && isZeroTokenProvider(row.provider),
  );
  const resolved = zeroTokenRuntime ?? recent ?? defaults;

  return {
    hasZeroTokenRuntimeModel: Boolean(resolved && isZeroTokenProvider(resolved.provider)),
    runtimeProvider: resolved?.provider,
    runtimeModel: resolved?.model,
    runtimeModelRef: resolved ? `${resolved.provider}/${resolved.model}` : undefined,
    runtimeModelSource: recentModels.includes(resolved as { provider: string; model: string })
      ? ("recent" as const)
      : defaults && resolved === defaults
        ? ("defaults" as const)
        : undefined,
  };
}
