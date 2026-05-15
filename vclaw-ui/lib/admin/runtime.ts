import { getMessages } from "next-intl/server";

import {
  getAdminNavigation,
  getAdminPath,
  type AdminMessages,
} from "@/lib/admin/content";
import type { AppLocale } from "@/i18n/routing";

export async function getAdminLocaleContent(locale: AppLocale) {
  const messages = await getMessages({ locale });
  const admin = (messages as any).admin as AdminMessages;

  return {
    admin,
    navigation: getAdminNavigation(locale, admin.navigation),
    shell: admin.shell,
    workspaceLabels: {
      retail: admin.navigation.ws_retail,
      headhunter: admin.navigation.ws_headhunter,
    },
    guideHref: getAdminPath(locale, "/admin/guide"),
    guideLabel: admin.navigation.guide,
  };
}
