"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { IntegrationAccount } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { markIntegrationConnected, disconnectIntegration } from "@/lib/actions/integration-actions";
import { INTEGRATION_PROVIDERS } from "@/lib/integration-providers";

const LABELS: Record<string, string> = {
  ZALO: "Zalo OA",
  META: "Facebook / Instagram",
  SHOPEE: "Shopee",
  TELEGRAM: "Telegram",
};

type Messages = {
  title: string;
  hint: string;
  connect: string;
  disconnect: string;
  connected: string;
  notConnected: string;
};

export function IntegrationPanel({
  initialAccounts,
  messages,
}: {
  initialAccounts: IntegrationAccount[];
  messages: Messages;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const map = Object.fromEntries(initialAccounts.map((a) => [a.provider, a]));

  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2">
      {INTEGRATION_PROVIDERS.map((provider) => {
        const row = map[provider];
        return (
          <Card key={provider} className="border-[color:var(--line)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between gap-2">
                <span>{LABELS[provider] ?? provider}</span>
                <Badge variant="outline">
                  {row?.connectedAt ? messages.connected : messages.notConnected}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-[color:var(--muted)]">{messages.hint}</p>
              {row?.displayName ? (
                <p className="text-sm text-[color:var(--foreground-strong)]">{row.displayName}</p>
              ) : null}
              <div className="flex gap-2">
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
                  {messages.connect}
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
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
