import { getMessages } from "next-intl/server";

import {
  getAdminNavigation,
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
  };
}
