import { setRequestLocale } from "next-intl/server";
import { AdminShell, ListCard, NextStepBanner, WorkflowCard } from "@/components/admin/admin-shell";
import { ShippingManager } from "@/components/admin/shipping-manager";
import { getAdminPath } from "@/lib/admin-content";
import { getAdminLocaleContent } from "@/lib/admin-runtime";
import type { AppLocale } from "@/i18n/routing";

type ShippingPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function ShippingPage({ params }: ShippingPageProps) {
  const { locale } = (await params) as { locale: AppLocale };
  setRequestLocale(locale);
  const { admin, navigation, shell } = await getAdminLocaleContent(locale);
  const content = admin.shipping;

  if (!content) {
    return null;
  }

  return (
    <AdminShell
      navigation={navigation}
      currentPath={getAdminPath(locale, "/admin/shipping")}
      title={content.title}
      description={content.description}
      badge={shell.badge}
      sidebarTitle={shell.sidebarTitle}
      sidebarDescription={shell.sidebarDescription}
    >
      {/* Component chính xử lý Giao vận */}
      <ShippingManager messages={content.manager} />

      {/* Thông tin bổ trợ: Danh sách nhà cung cấp */}
      <div className="grid gap-6 md:grid-cols-2">
        {content.list ? (
          <ListCard
            title={content.list.title}
            description={content.list.description}
            items={content.list.items}
          />
        ) : null}

        <WorkflowCard
          title={content.workflow.title}
          description={shell.workflowDescription}
          steps={content.workflow.steps}
        />
      </div>

      {content.nextStep ? (
        <NextStepBanner
          href={getAdminPath(locale, "/admin/reports")}
          label={content.nextStep.label}
          copy={content.nextStep.copy}
        />
      ) : null}
    </AdminShell>
  );
}
