import { setRequestLocale } from "next-intl/server";
import { AdminShell } from "@/components/admin/admin-shell";
import { OnboardingWizard } from "@/components/admin/onboarding-wizard";
import { getAdminPath } from "@/lib/admin-content";
import { getAdminLocaleContent } from "@/lib/admin-runtime";
import type { AppLocale } from "@/i18n/routing";

type OnboardingPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function OnboardingPage({ params }: OnboardingPageProps) {
  const { locale } = (await params) as { locale: AppLocale };
  setRequestLocale(locale);
  const { admin, navigation, shell } = await getAdminLocaleContent(locale);

  return (
    <AdminShell
      navigation={navigation}
      currentPath={getAdminPath(locale, "/admin/onboarding")}
      title={admin.onboarding.title}
      description={admin.onboarding.description}
      badge={shell.badge}
      sidebarTitle={shell.sidebarTitle}
      sidebarDescription={shell.sidebarDescription}
    >
      <OnboardingWizard />
    </AdminShell>
  );
}
