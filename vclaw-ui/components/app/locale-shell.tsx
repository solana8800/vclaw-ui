import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";

import { SiteHeader } from "@/components/app/site-header";
import { SiteFooter } from "@/components/app/site-footer";
import { AiChatAssistant } from "@/components/admin/ai-chat-assistant";
import type { AppLocale } from "@/i18n/routing";

type LocaleShellProps = {
  locale: AppLocale;
  children: ReactNode;
};

export async function LocaleShell({ locale, children }: LocaleShellProps) {
  setRequestLocale(locale);
  const messages = await getMessages({ locale });

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="vclaw-shell">
        <SiteHeader locale={locale} />
        <main className="flex-1">
          {children}
        </main>
        <AiChatAssistant />
        <SiteFooter locale={locale} />
      </div>
    </NextIntlClientProvider>
  );
}
