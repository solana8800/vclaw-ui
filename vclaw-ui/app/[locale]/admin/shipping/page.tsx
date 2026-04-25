import { setRequestLocale } from "next-intl/server";
import {
  AdminShell,
  ListCard,
  NextStepBanner,
  WorkflowCard,
} from "@/components/admin/admin-shell";
import { ShippingManager } from "@/components/admin/shipping-manager";
import { ShippingOrderNotes } from "@/components/admin/shipping-order-notes";
import { getAdminPath } from "@/lib/admin/content";
import { getAdminLocaleContent } from "@/lib/admin/runtime";
import { getOrders, type OrderWithCustomer } from "@/lib/commerce/orders";
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

  const orders = await getOrders();
  const shippingRows = (orders as any[]).map((o: any) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    customerName: o.customer.name,
    shippingNote: o.shippingNote,
    shippingEstimate: o.shippingEstimate,
  }));

  const managerMessages = {
    ...content.manager,
    title: content.manager?.title ?? content.title,
    description: content.manager?.description ?? content.description,
  };

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
      <div className="grid gap-6 lg:grid-cols-2">
        <ShippingManager messages={managerMessages} />
        {content.shippingOrderNotes ? (
          <ShippingOrderNotes
            initialOrders={shippingRows}
            messages={content.shippingOrderNotes}
          />
        ) : null}
      </div>

      <div className="grid gap-6 md:grid-cols-2 mt-6">
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
