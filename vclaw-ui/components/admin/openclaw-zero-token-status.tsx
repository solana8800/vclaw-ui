"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getLocaleHref, isSupportedLocale, type AppLocale } from "@/i18n/routing";
import {
  resolveGatewayHealthAction,
  type GatewayHealthActionReason,
} from "@/lib/openclaw/zero-token-health-action";
import { cn } from "@/lib/shared";
import { formatGatewayHealthMessage } from "@/lib/openclaw/zero-token-health-message";
import type { GatewayHealthDiagnosis, GatewayVariant } from "@/lib/openclaw/zero-token-health";

export type GatewayHealthCardState = {
  ok: boolean;
  status: number;
  baseUrl: string;
  wsUrl?: string;
  authConfigured?: boolean;
  mode?: GatewayVariant;
  diagnosis?: GatewayHealthDiagnosis;
  readiness?: {
    hasZeroTokenModels: boolean;
    hasUsableZeroTokenAuth: boolean;
    hasZeroTokenRuntimeModel: boolean;
    zeroTokenProviders: string[];
    sampleModels: string[];
    runtimeModelRef?: string;
    runtimeModelSource?: "defaults" | "recent";
    authProviders: Array<{ provider: string; displayName: string; status: string }>;
  };
  error?: string;
};

type StatusLabels = {
  title: string;
  description: string;
  refresh: string;
  checking: string;
  modeLabel: string;
  restLabel: string;
  wsLabel: string;
  authLabel: string;
  diagnosisLabel: string;
  catalogLabel: string;
  runtimeModelLabel: string;
  authProvidersLabel: string;
  readinessLabels: {
    catalog: string;
    auth: string;
    runtime: string;
    ok: string;
    notReady: string;
    unknown: string;
  };
  actionTitle: string;
  actionButton: string;
  actionDescriptions: Record<GatewayHealthActionReason, string>;
  empty: string;
  modeValues: Record<GatewayVariant, string>;
  authValues: {
    configured: string;
    missing: string;
  };
  diagnosisValues: Record<GatewayHealthDiagnosis, string>;
};

function badgeTone(state: GatewayHealthCardState | null): string {
  if (!state) return "border-zinc-300 bg-zinc-100 text-zinc-700";
  if (state.diagnosis === "ok" && state.authConfigured === true) {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }
  return "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300";
}

function readinessBadgeTone(ok: boolean): string {
  return ok
    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    : "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300";
}

function readinessValueLabel(
  input: { value?: boolean; unknown?: boolean },
  labels: StatusLabels["readinessLabels"],
): string {
  if (input.unknown) return labels.unknown;
  return input.value ? labels.ok : labels.notReady;
}

export function OpenclawZeroTokenStatusCard({
  state,
  isLoading,
  labels,
  onRefresh,
  actionHref,
}: {
  state: GatewayHealthCardState | null;
  isLoading: boolean;
  labels: StatusLabels;
  onRefresh: () => void;
  actionHref: string;
}) {
  const diagnosis = state?.diagnosis ?? "unreachable";
  const mode = state?.mode ?? "unknown";
  const authConfigured = state?.authConfigured === true;
  const actionReason = state
    ? resolveGatewayHealthAction({
        diagnosis,
        mode,
        authConfigured,
        readiness: state.readiness,
      })
    : null;

  return (
    <Card className="border-[color:var(--line)] shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-3 border-b border-[color:var(--line)]">
        <div className="space-y-1">
          <CardTitle className="text-sm font-black tracking-tight">{labels.title}</CardTitle>

        </div>
        <Button size="sm" variant="ghost" className="h-8 rounded-lg text-[10px] font-bold uppercase" onClick={onRefresh} disabled={isLoading}>
          {isLoading ? labels.checking : labels.refresh}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {state ? (
          <>
            <div className={cn("rounded-2xl border px-3 py-3 text-xs font-bold", badgeTone(state))}>
              {formatGatewayHealthMessage({
                diagnosis,
                baseUrl: state.baseUrl || "—",
                wsUrl: state.wsUrl || "—",
                mode,
                authConfigured,
                status: state.status,
                readiness: state.readiness,
              })}
            </div>
            <div className="flex flex-wrap gap-2">
              <div className={cn("rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest", readinessBadgeTone(state.readiness?.hasZeroTokenModels === true))}>
                {`${labels.readinessLabels.catalog}: ${state.readiness?.hasZeroTokenModels ? labels.readinessLabels.ok : labels.readinessLabels.notReady}`}
              </div>
              <div className={cn("rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest", readinessBadgeTone(state.readiness?.hasUsableZeroTokenAuth === true))}>
                {`${labels.readinessLabels.auth}: ${readinessValueLabel(
                  {
                    value: state.readiness?.hasUsableZeroTokenAuth,
                    unknown:
                      state.readiness?.hasUsableZeroTokenAuth === false &&
                      Array.isArray(state.readiness.authProviders) &&
                      state.readiness.authProviders.length === 0,
                  },
                  labels.readinessLabels,
                )}`}
              </div>
              <div className={cn("rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest", readinessBadgeTone(state.readiness?.hasZeroTokenRuntimeModel === true))}>
                {`${labels.readinessLabels.runtime}: ${state.readiness?.hasZeroTokenRuntimeModel ? labels.readinessLabels.ok : labels.readinessLabels.notReady}`}
              </div>
            </div>
            {actionReason ? (
              <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 px-3 py-3 text-xs text-sky-900 dark:text-sky-100">
                <div className="font-black uppercase tracking-widest">{labels.actionTitle}</div>
                <p className="mt-1 leading-relaxed">{labels.actionDescriptions[actionReason]}</p>
                <Button href={actionHref} size="sm" className="mt-3 h-8 rounded-lg text-[10px] font-black uppercase tracking-widest">
                  {labels.actionButton}
                </Button>
              </div>
            ) : null}
            <dl className="grid gap-3 text-xs sm:grid-cols-2">
              <div className="rounded-xl border border-[color:var(--line)] px-3 py-2">
                <dt className="text-[10px] font-black uppercase tracking-widest text-[color:var(--muted)]">{labels.modeLabel}</dt>
                <dd className="mt-1 font-bold">{labels.modeValues[mode]}</dd>
              </div>
              <div className="rounded-xl border border-[color:var(--line)] px-3 py-2">
                <dt className="text-[10px] font-black uppercase tracking-widest text-[color:var(--muted)]">{labels.authLabel}</dt>
                <dd className="mt-1 font-bold">{authConfigured ? labels.authValues.configured : labels.authValues.missing}</dd>
              </div>
              <div className="rounded-xl border border-[color:var(--line)] px-3 py-2">
                <dt className="text-[10px] font-black uppercase tracking-widest text-[color:var(--muted)]">{labels.restLabel}</dt>
                <dd className="mt-1 break-all font-mono text-[11px]">{state.baseUrl || "—"}</dd>
              </div>
              <div className="rounded-xl border border-[color:var(--line)] px-3 py-2">
                <dt className="text-[10px] font-black uppercase tracking-widest text-[color:var(--muted)]">{labels.wsLabel}</dt>
                <dd className="mt-1 break-all font-mono text-[11px]">{state.wsUrl || "—"}</dd>
              </div>
              <div className="rounded-xl border border-[color:var(--line)] px-3 py-2 sm:col-span-2">
                <dt className="text-[10px] font-black uppercase tracking-widest text-[color:var(--muted)]">{labels.diagnosisLabel}</dt>
                <dd className="mt-1 font-bold">{labels.diagnosisValues[diagnosis]}</dd>
              </div>
              <div className="rounded-xl border border-[color:var(--line)] px-3 py-2 sm:col-span-2">
                <dt className="text-[10px] font-black uppercase tracking-widest text-[color:var(--muted)]">{labels.catalogLabel}</dt>
                <dd className="mt-1 break-all font-mono text-[11px]">
                  {state.readiness?.sampleModels.length ? state.readiness.sampleModels.join(", ") : "—"}
                </dd>
              </div>
              <div className="rounded-xl border border-[color:var(--line)] px-3 py-2 sm:col-span-2">
                <dt className="text-[10px] font-black uppercase tracking-widest text-[color:var(--muted)]">{labels.runtimeModelLabel}</dt>
                <dd className="mt-1 break-all font-mono text-[11px]">
                  {state.readiness?.runtimeModelRef
                    ? `${state.readiness.runtimeModelRef}${state.readiness.runtimeModelSource ? ` (${state.readiness.runtimeModelSource})` : ""}`
                    : "—"}
                </dd>
              </div>
              <div className="rounded-xl border border-[color:var(--line)] px-3 py-2 sm:col-span-2">
                <dt className="text-[10px] font-black uppercase tracking-widest text-[color:var(--muted)]">{labels.authProvidersLabel}</dt>
                <dd className="mt-1 space-y-1">
                  {state.readiness?.authProviders.length ? (
                    state.readiness.authProviders.map((row) => (
                      <div key={row.provider} className="flex items-center justify-between gap-3">
                        <span className="font-bold">{row.displayName}</span>
                        <span className="font-mono text-[11px]">{row.status}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-[color:var(--muted)]">—</span>
                  )}
                </dd>
              </div>
            </dl>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-[color:var(--line)] px-3 py-4 text-xs text-[color:var(--muted)]">
            {labels.empty}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function OpenclawZeroTokenStatus() {
  const t = useTranslations("admin.openclawStatus");
  const localeRaw = useLocale();
  const locale: AppLocale = isSupportedLocale(localeRaw) ? localeRaw : "vi";
  const [state, setState] = useState<GatewayHealthCardState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const actionHref = getLocaleHref(locale, "https://vclaw.space/vi/docs/11-User-Manual-And-Installation");

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/openclaw-health", { cache: "no-store" });
      const data = (await res.json()) as GatewayHealthCardState;
      setState({
        ok: Boolean(data.ok),
        status: typeof data.status === "number" ? data.status : res.status,
        baseUrl: typeof data.baseUrl === "string" ? data.baseUrl : "",
        wsUrl: typeof data.wsUrl === "string" ? data.wsUrl : undefined,
        authConfigured: data.authConfigured === true,
        mode: data.mode ?? "unknown",
        diagnosis: data.diagnosis ?? (data.ok ? "ok" : "http_error"),
        readiness: data.readiness,
        error: typeof data.error === "string" ? data.error : undefined,
      });
    } catch {
      setState({
        ok: false,
        status: 0,
        baseUrl: "",
        wsUrl: "",
        authConfigured: false,
        mode: "unknown",
        diagnosis: "unreachable",
        error: "unreachable",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  return (
    <OpenclawZeroTokenStatusCard
      state={state}
      isLoading={isLoading}
      onRefresh={() => void load()}
      actionHref={actionHref}
      labels={{
        title: t("title"),
        description: t("description"),
        refresh: t("refresh"),
        checking: t("checking"),
        modeLabel: t("modeLabel"),
        restLabel: t("restLabel"),
        wsLabel: t("wsLabel"),
        authLabel: t("authLabel"),
        diagnosisLabel: t("diagnosisLabel"),
        catalogLabel: t("catalogLabel"),
        runtimeModelLabel: t("runtimeModelLabel"),
        authProvidersLabel: t("authProvidersLabel"),
        readinessLabels: {
          catalog: t("readinessLabels.catalog"),
          auth: t("readinessLabels.auth"),
          runtime: t("readinessLabels.runtime"),
          ok: t("readinessLabels.ok"),
          notReady: t("readinessLabels.notReady"),
          unknown: t("readinessLabels.unknown"),
        },
        actionTitle: t("actionTitle"),
        actionButton: t("actionButton"),
        actionDescriptions: {
          missing_token: t("actionDescriptions.missing_token"),
          unauthorized: t("actionDescriptions.unauthorized"),
          unreachable: t("actionDescriptions.unreachable"),
          missing_catalog: t("actionDescriptions.missing_catalog"),
          auth_unusable: t("actionDescriptions.auth_unusable"),
          runtime_not_web: t("actionDescriptions.runtime_not_web"),
          runtime_unknown: t("actionDescriptions.runtime_unknown"),
        },
        empty: t("empty"),
        modeValues: {
          "zero-token": t("modeValues.zero-token"),
          upstream: t("modeValues.upstream"),
          unknown: t("modeValues.unknown"),
        },
        authValues: {
          configured: t("authValues.configured"),
          missing: t("authValues.missing"),
        },
        diagnosisValues: {
          ok: t("diagnosisValues.ok"),
          unauthorized: t("diagnosisValues.unauthorized"),
          unreachable: t("diagnosisValues.unreachable"),
          http_error: t("diagnosisValues.http_error"),
        },
      }}
    />
  );
}
