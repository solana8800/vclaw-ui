import { setRequestLocale } from "next-intl/server";
import { AdminShell, NextStepBanner, WorkflowCard } from "@/components/admin/admin-shell";
import { ShippingCarriersStatus } from "@/components/admin/shipping-carriers-status";
import { ShippingManager } from "@/components/admin/shipping-manager";
import { ShippingOrderNotes } from "@/components/admin/shipping-order-notes";
import { ShippingList } from "@/components/admin/shipping-list";
import { getAdminPath } from "@/lib/admin/content";
import { getAdminLocaleContent } from "@/lib/admin/runtime";
import { getOrders, type OrderWithCustomer } from "@/lib/commerce/orders";
import { getShopSettings } from "@/lib/actions/shop-settings-actions";
import { getGhtkResolvedConfig } from "@/lib/logistics/ghtk-config";
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
  const shopRow = await getShopSettings();
  const ghtkCfg = await getGhtkResolvedConfig();
  const ghtkLive = Boolean(
    ghtkCfg.token &&
      ghtkCfg.pickProvince &&
      ghtkCfg.pickDistrict &&
      ghtkCfg.receiverProvince &&
      ghtkCfg.receiverDistrict &&
      ghtkCfg.receiverAddress,
  );
  const ghtkPartial = Boolean(ghtkCfg.token) && !ghtkLive;
  const ghnConfigured = Boolean(
    (shopRow?.ghnToken ?? "").trim() && (shopRow?.ghnShopId ?? "").trim(),
  );

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

  // Lấy đơn hàng cần giao vận (Physical hoặc Digital chưa hoàn thành)
  const pendingFulfillment = (orders as any[]).filter(o => o.fulfillmentStatus === "PENDING") as OrderWithCustomer[];

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
      <div className="space-y-6">
        <ShippingList 
          orders={pendingFulfillment} 
          shipperGroupId={shopRow?.shipperGroupId || undefined} 
        />

        <div className="grid gap-6 lg:grid-cols-2 items-start">
          <div className="space-y-6">
            {content.shippingOrderNotes ? (
              <ShippingOrderNotes
                initialOrders={shippingRows}
                messages={content.shippingOrderNotes}
              />
            ) : null}
          </div>
          
          <div className="space-y-6">
            <ShippingManager messages={managerMessages} />
            <ShippingCarriersStatus
              locale={locale}
              ghtkLive={ghtkLive}
              ghtkPartial={ghtkPartial}
              ghnConfigured={ghnConfigured}
            />
            <WorkflowCard
              title={content.workflow.title}
              description={shell.workflowDescription}
              steps={content.workflow.steps}
            />
          </div>
        </div>
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
