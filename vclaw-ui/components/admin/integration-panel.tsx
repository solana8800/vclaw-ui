"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { IntegrationAccount } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  disconnectIntegration,
  markIntegrationConnected,
  refreshZaloOaTokenAction,
  saveGhtkCredentials,
  type IntegrationConnectionPublic,
} from "@/lib/actions/integration-actions";
import { INTEGRATION_PROVIDERS } from "@/lib/integration-providers";
import { INTEGRATION_CONSOLE_URLS, INTEGRATION_DEV_PORTAL_BY_PROVIDER } from "@/lib/integration-external-links";
import {
  CHANNEL_GHTK,
  CHANNEL_META_FB,
  CHANNEL_SHOPEE_OPEN,
  CHANNEL_ZALO_OA,
} from "@/lib/channel-connection-providers";
import { ExternalLink } from "lucide-react";
import { IntegrationOauthBanner } from "@/components/admin/integration-oauth-banner";
import type { IntegrationOauthFlashKey } from "@/lib/integration-oauth-flash";
import { getLocaleHref } from "@/i18n/routing";

const LABELS: Record<string, string> = {
  ZALO: "Zalo OA",
  META: "Facebook / Instagram",
  SHOPEE: "Shopee",
  TELEGRAM: "Telegram",
};

type Messages = {
  title: string;
  hint: string;
  connectManual: string;
  disconnect: string;
  connectedOauth: string;
  connectedManual: string;
  notConnected: string;
  oauthZaloCta: string;
  oauthMetaCta: string;
  oauthShopeeCta: string;
  webhookHint?: string;
  oauthUnavailable?: string;
  oauthMetaUnavailable?: string;
  oauthShopeeUnavailable?: string;
  developerPortal: string;
  pilotNoOAuth: string;
  profileSavedTitle: string;
  metaProfileSavedTitle: string;
  shopeeProfileSavedTitle: string;
  oaIdLabel: string;
  metaUserLabel: string;
  metaPagesLabel: string;
  shopeeShopLabel: string;
  tokenExpiresLabel: string;
  zaloRefreshCta: string;
  shippingApisTitle: string;
  shippingApisBody: string;
  openGhnDocs: string;
  openGhtkDocs: string;
  ghtkSectionTitle: string;
  ghtkSectionBody: string;
  ghtkTokenLabel: string;
  ghtkPickProvince: string;
  ghtkPickDistrict: string;
  ghtkRecvProvince: string;
  ghtkRecvDistrict: string;
  ghtkRecvAddress: string;
  ghtkSave: string;
  ghtkSaveError: string;
  ghtkStoredHint: string;
  oauthFlash?: Record<string, string>;
  openGhtkSeller?: string;
  ghtkSellerHint?: string;
  envHintTitle?: string;
  envHintBody?: string;
};

const fieldClass =
  "mt-1 flex h-9 w-full rounded-md border border-[color:var(--line)] bg-[color:var(--surface)] px-3 text-sm text-[color:var(--foreground-strong)]";

function parseZaloSavedProfile(profileJson: string | null): { name: string | null; oaId: string | null } {
  if (!profileJson) return { name: null, oaId: null };
  try {
    const p = JSON.parse(profileJson) as { name?: string; oaId?: string };
    return {
      name: typeof p.name === "string" ? p.name : null,
      oaId: typeof p.oaId === "string" ? p.oaId : null,
    };
  } catch {
    return { name: null, oaId: null };
  }
}

function parseMetaPublicProfile(profileJson: string | null): {
  userName: string | null;
  pagesCount: number;
} {
  if (!profileJson) return { userName: null, pagesCount: 0 };
  try {
    const p = JSON.parse(profileJson) as {
      user?: { name?: string };
      pages?: unknown[];
    };
    return {
      userName: typeof p.user?.name === "string" ? p.user.name : null,
      pagesCount: Array.isArray(p.pages) ? p.pages.length : 0,
    };
  } catch {
    return { userName: null, pagesCount: 0 };
  }
}

function parseShopeePublicProfile(profileJson: string | null): { shopName: string | null; shopId: string | null } {
  if (!profileJson) return { shopName: null, shopId: null };
  try {
    const p = JSON.parse(profileJson) as { shopName?: string | null; shopId?: string | null };
    return {
      shopName: typeof p.shopName === "string" ? p.shopName : null,
      shopId: typeof p.shopId === "string" ? p.shopId : p.shopId != null ? String(p.shopId) : null,
    };
  } catch {
    return { shopName: null, shopId: null };
  }
}

function parseGhtkAddresses(profileJson: string | null): {
  pickProvince: string;
  pickDistrict: string;
  receiverProvince: string;
  receiverDistrict: string;
  receiverAddress: string;
} {
  const empty = {
    pickProvince: "",
    pickDistrict: "",
    receiverProvince: "",
    receiverDistrict: "",
    receiverAddress: "",
  };
  if (!profileJson) return empty;
  try {
    const p = JSON.parse(profileJson) as Record<string, string>;
    return {
      pickProvince: p.pickProvince ?? "",
      pickDistrict: p.pickDistrict ?? "",
      receiverProvince: p.receiverProvince ?? "",
      receiverDistrict: p.receiverDistrict ?? "",
      receiverAddress: p.receiverAddress ?? "",
    };
  } catch {
    return empty;
  }
}

export function IntegrationPanel({
  initialAccounts,
  initialConnections,
  messages,
  publicOrigin,
  oauthLocale,
  oauthFlashKey,
}: {
  initialAccounts: IntegrationAccount[];
  initialConnections: IntegrationConnectionPublic[];
  messages: Messages;
  publicOrigin?: string;
  oauthLocale: "vi" | "en";
  oauthFlashKey?: IntegrationOauthFlashKey | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [ghtkError, setGhtkError] = useState<string | null>(null);

  const map = useMemo(
    () => Object.fromEntries(initialAccounts.map((a) => [a.provider, a])),
    [initialAccounts],
  );
  const zaloOa = initialConnections.find((c) => c.provider === CHANNEL_ZALO_OA);
  const metaFb = initialConnections.find((c) => c.provider === CHANNEL_META_FB);
  const shopeeOpen = initialConnections.find((c) => c.provider === CHANNEL_SHOPEE_OPEN);
  const ghtkConn = initialConnections.find((c) => c.provider === CHANNEL_GHTK);

  const zaloOauthActive = Boolean(zaloOa?.hasAccessToken);
  const metaOauthActive = Boolean(metaFb?.hasAccessToken);
  const shopeeOauthActive = Boolean(shopeeOpen?.hasAccessToken);
  const ghtkSaved = Boolean(ghtkConn?.hasAccessToken);

  const zaloSaved = parseZaloSavedProfile(zaloOa?.profileJson ?? null);
  const metaSaved = parseMetaPublicProfile(metaFb?.profileJson ?? null);
  const shopeeSaved = parseShopeePublicProfile(shopeeOpen?.profileJson ?? null);
  const ghtkDefaults = parseGhtkAddresses(ghtkConn?.profileJson ?? null);

  const [ghtkToken, setGhtkToken] = useState("");
  const [ghtkPickPv, setGhtkPickPv] = useState(ghtkDefaults.pickProvince);
  const [ghtkPickDt, setGhtkPickDt] = useState(ghtkDefaults.pickDistrict);
  const [ghtkRecvPv, setGhtkRecvPv] = useState(ghtkDefaults.receiverProvince);
  const [ghtkRecvDt, setGhtkRecvDt] = useState(ghtkDefaults.receiverDistrict);
  const [ghtkRecvAddr, setGhtkRecvAddr] = useState(ghtkDefaults.receiverAddress);

  const zaloStart = `/api/auth/channel/zalo/start?locale=${oauthLocale}`;
  const metaStart = `/api/auth/channel/meta/start?locale=${oauthLocale}`;
  const shopeeStart = `/api/auth/channel/shopee/start?locale=${oauthLocale}`;
  const integrationsCleanHref = getLocaleHref(oauthLocale, "/admin/integrations");
  const flashMessage =
    oauthFlashKey && messages.oauthFlash?.[oauthFlashKey]
      ? messages.oauthFlash[oauthFlashKey]
      : oauthFlashKey
        ? oauthFlashKey
        : null;

  return (
    <div className="mt-6 space-y-6">
      {oauthFlashKey && flashMessage ? (
        <IntegrationOauthBanner
          flashKey={oauthFlashKey}
          message={flashMessage}
          cleanHref={integrationsCleanHref}
        />
      ) : null}

      {messages.envHintTitle && messages.envHintBody ? (
        <div className="rounded-lg border border-dashed border-[color:var(--line)] bg-[color:var(--surface-soft)] p-3 text-xs text-[color:var(--muted)]">
          <p className="font-medium text-[color:var(--foreground-strong)]">{messages.envHintTitle}</p>
          <p className="mt-1">{messages.envHintBody}</p>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {INTEGRATION_PROVIDERS.map((provider) => {
          const row = map[provider];
          const devPortal = INTEGRATION_DEV_PORTAL_BY_PROVIDER[provider];
          const isZalo = provider === "ZALO";
          const isMeta = provider === "META";
          const isShopee = provider === "SHOPEE";
          const isTelegram = provider === "TELEGRAM";

          let oauthConnected = false;
          if (isZalo) oauthConnected = zaloOauthActive;
          else if (isMeta) oauthConnected = metaOauthActive;
          else if (isShopee) oauthConnected = shopeeOauthActive;

          const manualOnly = Boolean(row?.connectedAt) && !oauthConnected;

          const badgeLabel = oauthConnected
            ? messages.connectedOauth
            : manualOnly
              ? messages.connectedManual
              : messages.notConnected;

          return (
            <Card key={provider} className="border-[color:var(--line)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between gap-2">
                  <span>{LABELS[provider] ?? provider}</span>
                  <Badge variant="outline">{badgeLabel}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-[color:var(--muted)]">{messages.hint}</p>

                {isZalo && oauthConnected ? (
                  <div className="rounded-lg border border-[color:var(--line)] bg-[color:var(--surface-soft)] p-3 text-xs space-y-2">
                    <p className="font-medium text-[color:var(--foreground-strong)]">{messages.profileSavedTitle}</p>
                    {(zaloSaved.name || row?.displayName) && (
                      <p className="text-[color:var(--foreground-strong)]">
                        <span className="text-[color:var(--muted)]">OA: </span>
                        {zaloSaved.name ?? row?.displayName}
                      </p>
                    )}
                    {(zaloSaved.oaId || zaloOa?.externalAccountId) && (
                      <p className="text-[color:var(--muted)]">
                        {messages.oaIdLabel}{" "}
                        <code className="text-[color:var(--foreground-strong)]">
                          {zaloSaved.oaId ?? zaloOa?.externalAccountId}
                        </code>
                      </p>
                    )}
                    {zaloOa?.expiresAtIso && (
                      <p className="text-[color:var(--muted)]">
                        {messages.tokenExpiresLabel}{" "}
                        <time dateTime={zaloOa.expiresAtIso}>{zaloOa.expiresAtIso}</time>
                      </p>
                    )}
                  </div>
                ) : null}

                {isMeta && oauthConnected ? (
                  <div className="rounded-lg border border-[color:var(--line)] bg-[color:var(--surface-soft)] p-3 text-xs space-y-2">
                    <p className="font-medium text-[color:var(--foreground-strong)]">{messages.metaProfileSavedTitle}</p>
                    {metaSaved.userName && (
                      <p className="text-[color:var(--muted)]">
                        {messages.metaUserLabel}{" "}
                        <span className="text-[color:var(--foreground-strong)]">{metaSaved.userName}</span>
                      </p>
                    )}
                    <p className="text-[color:var(--muted)]">
                      {messages.metaPagesLabel}{" "}
                      <span className="text-[color:var(--foreground-strong)]">{metaSaved.pagesCount}</span>
                    </p>
                    {metaFb?.expiresAtIso && (
                      <p className="text-[color:var(--muted)]">
                        {messages.tokenExpiresLabel}{" "}
                        <time dateTime={metaFb.expiresAtIso}>{metaFb.expiresAtIso}</time>
                      </p>
                    )}
                  </div>
                ) : null}

                {isShopee && oauthConnected ? (
                  <div className="rounded-lg border border-[color:var(--line)] bg-[color:var(--surface-soft)] p-3 text-xs space-y-2">
                    <p className="font-medium text-[color:var(--foreground-strong)]">
                      {messages.shopeeProfileSavedTitle}
                    </p>
                    {(shopeeSaved.shopName || row?.displayName) && (
                      <p className="text-[color:var(--foreground-strong)]">{shopeeSaved.shopName ?? row?.displayName}</p>
                    )}
                    {(shopeeSaved.shopId || shopeeOpen?.externalAccountId) && (
                      <p className="text-[color:var(--muted)]">
                        {messages.shopeeShopLabel}{" "}
                        <code className="text-[color:var(--foreground-strong)]">
                          {shopeeSaved.shopId ?? shopeeOpen?.externalAccountId}
                        </code>
                      </p>
                    )}
                    {shopeeOpen?.expiresAtIso && (
                      <p className="text-[color:var(--muted)]">
                        {messages.tokenExpiresLabel}{" "}
                        <time dateTime={shopeeOpen.expiresAtIso}>{shopeeOpen.expiresAtIso}</time>
                      </p>
                    )}
                  </div>
                ) : null}

                {!isZalo && !isMeta && !isShopee && row?.displayName ? (
                  <p className="text-sm text-[color:var(--foreground-strong)]">{row.displayName}</p>
                ) : null}

                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap gap-2">
                    {isZalo ? (
                      <>
                        <Button size="sm" className="rounded-lg" href={zaloStart}>
                          {messages.oauthZaloCta}
                        </Button>
                        {zaloOa?.hasRefreshToken ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="rounded-lg"
                            disabled={isPending}
                            onClick={() => {
                              startTransition(async () => {
                                await refreshZaloOaTokenAction();
                                router.refresh();
                              });
                            }}
                          >
                            {messages.zaloRefreshCta}
                          </Button>
                        ) : null}
                        {oauthConnected || row ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isPending}
                            onClick={() => {
                              startTransition(async () => {
                                await disconnectIntegration("ZALO");
                                router.refresh();
                              });
                            }}
                          >
                            {messages.disconnect}
                          </Button>
                        ) : null}
                      </>
                    ) : null}

                    {isMeta ? (
                      <>
                        <Button size="sm" className="rounded-lg" href={metaStart}>
                          {messages.oauthMetaCta}
                        </Button>
                        {oauthConnected || row ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isPending}
                            onClick={() => {
                              startTransition(async () => {
                                await disconnectIntegration("META");
                                router.refresh();
                              });
                            }}
                          >
                            {messages.disconnect}
                          </Button>
                        ) : null}
                      </>
                    ) : null}

                    {isShopee ? (
                      <>
                        <Button size="sm" className="rounded-lg" href={shopeeStart}>
                          {messages.oauthShopeeCta}
                        </Button>
                        {oauthConnected || row ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isPending}
                            onClick={() => {
                              startTransition(async () => {
                                await disconnectIntegration("SHOPEE");
                                router.refresh();
                              });
                            }}
                          >
                            {messages.disconnect}
                          </Button>
                        ) : null}
                      </>
                    ) : null}

                    {isTelegram ? (
                      <>
                        <Button
                          size="sm"
                          className="rounded-lg"
                          disabled={isPending}
                          onClick={() => {
                            startTransition(async () => {
                              await markIntegrationConnected(provider, LABELS[provider]);
                              router.refresh();
                            });
                          }}
                        >
                          {messages.connectManual}
                        </Button>
                        {row ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isPending}
                            onClick={() => {
                              startTransition(async () => {
                                await disconnectIntegration(provider);
                                router.refresh();
                              });
                            }}
                          >
                            {messages.disconnect}
                          </Button>
                        ) : null}
                      </>
                    ) : null}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-center gap-2 rounded-lg"
                    href={devPortal}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 shrink-0" />
                    {messages.developerPortal}
                  </Button>

                  {isZalo ? (
                    <div className="rounded-lg border border-[color:var(--line)] bg-[color:var(--surface-soft)] p-2 text-[11px] space-y-2">
                      <p className="text-[color:var(--muted)]">
                        {messages.webhookHint ?? "Webhook:"}{" "}
                        <code className="text-[color:var(--foreground-strong)] break-all">
                          {publicOrigin ? `${publicOrigin}/api/webhooks/channel/zalo` : "/api/webhooks/channel/zalo"}
                        </code>
                      </p>
                      <p className="text-[10px] text-[color:var(--muted)]">
                        {messages.oauthUnavailable ??
                          "Cần ZALO_OA_APP_ID và ZALO_OA_APP_SECRET trên server."}
                      </p>
                    </div>
                  ) : null}

                  {isMeta ? (
                    <p className="text-[11px] text-[color:var(--muted)]">
                      {messages.oauthMetaUnavailable ??
                        "Cần META_APP_ID và META_APP_SECRET; cấu hình redirect trong Meta Developer Console."}
                    </p>
                  ) : null}

                  {isShopee ? (
                    <p className="text-[11px] text-[color:var(--muted)]">
                      {messages.oauthShopeeUnavailable ??
                        "Cần SHOPEE_PARTNER_ID và SHOPEE_PARTNER_KEY; đăng ký redirect URL trên Shopee Open Platform."}
                    </p>
                  ) : null}

                  {isTelegram ? (
                    <p className="text-[11px] text-[color:var(--muted)]">{messages.pilotNoOAuth}</p>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-[color:var(--line)] border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{messages.shippingApisTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-xs text-[color:var(--muted)]">
          <p>{messages.shippingApisBody}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 rounded-lg"
              href={INTEGRATION_CONSOLE_URLS.ghn}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4 shrink-0" />
              {messages.openGhnDocs}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 rounded-lg"
              href={INTEGRATION_CONSOLE_URLS.ghtk}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4 shrink-0" />
              {messages.openGhtkDocs}
            </Button>
          </div>

          <div className="rounded-lg border border-[color:var(--line)] bg-[color:var(--surface-soft)] p-4 space-y-3 text-[color:var(--foreground-strong)]">
            <div>
              <p className="text-sm font-medium">{messages.ghtkSectionTitle}</p>
              <p className="mt-1 text-[11px] text-[color:var(--muted)]">{messages.ghtkSectionBody}</p>
            </div>
            {messages.ghtkSellerHint ? (
              <p className="text-[11px] text-[color:var(--muted)]">{messages.ghtkSellerHint}</p>
            ) : null}
            {messages.openGhtkSeller ? (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 rounded-lg"
                href={INTEGRATION_CONSOLE_URLS.ghtkSeller}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 shrink-0" />
                {messages.openGhtkSeller}
              </Button>
            ) : null}
            {ghtkSaved ? (
              <p className="text-[11px] text-[color:var(--muted)]">{messages.ghtkStoredHint}</p>
            ) : null}
            <label className="block text-[11px]">
              <span className="text-[color:var(--muted)]">{messages.ghtkTokenLabel}</span>
              <input
                type="password"
                autoComplete="off"
                className={fieldClass}
                value={ghtkToken}
                onChange={(e) => setGhtkToken(e.target.value)}
                placeholder="••••••••"
              />
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block text-[11px]">
                <span className="text-[color:var(--muted)]">{messages.ghtkPickProvince}</span>
                <input className={fieldClass} value={ghtkPickPv} onChange={(e) => setGhtkPickPv(e.target.value)} />
              </label>
              <label className="block text-[11px]">
                <span className="text-[color:var(--muted)]">{messages.ghtkPickDistrict}</span>
                <input className={fieldClass} value={ghtkPickDt} onChange={(e) => setGhtkPickDt(e.target.value)} />
              </label>
              <label className="block text-[11px]">
                <span className="text-[color:var(--muted)]">{messages.ghtkRecvProvince}</span>
                <input className={fieldClass} value={ghtkRecvPv} onChange={(e) => setGhtkRecvPv(e.target.value)} />
              </label>
              <label className="block text-[11px]">
                <span className="text-[color:var(--muted)]">{messages.ghtkRecvDistrict}</span>
                <input className={fieldClass} value={ghtkRecvDt} onChange={(e) => setGhtkRecvDt(e.target.value)} />
              </label>
            </div>
            <label className="block text-[11px]">
              <span className="text-[color:var(--muted)]">{messages.ghtkRecvAddress}</span>
              <input className={fieldClass} value={ghtkRecvAddr} onChange={(e) => setGhtkRecvAddr(e.target.value)} />
            </label>
            {ghtkError ? <p className="text-[11px] text-red-600">{messages.ghtkSaveError}</p> : null}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                className="rounded-lg"
                disabled={isPending}
                onClick={() => {
                  setGhtkError(null);
                  startTransition(async () => {
                    const r = await saveGhtkCredentials({
                      token: ghtkToken,
                      pickProvince: ghtkPickPv,
                      pickDistrict: ghtkPickDt,
                      receiverProvince: ghtkRecvPv,
                      receiverDistrict: ghtkRecvDt,
                      receiverAddress: ghtkRecvAddr,
                    });
                    if (!r.ok) {
                      setGhtkError(r.error ?? "error");
                      return;
                    }
                    setGhtkToken("");
                    router.refresh();
                  });
                }}
              >
                {messages.ghtkSave}
              </Button>
              {ghtkSaved ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-lg"
                  disabled={isPending}
                  onClick={() => {
                    startTransition(async () => {
                      await disconnectIntegration("GHTK");
                      router.refresh();
                    });
                  }}
                >
                  {messages.disconnect}
                </Button>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
