import { setRequestLocale } from "next-intl/server";
import { AdminShell, ListCard, NextStepBanner, WorkflowCard } from "@/components/admin/admin-shell";
import { ProductManager } from "@/components/admin/product-manager";
import { getAdminPath } from "@/lib/admin-content";
import { getAdminLocaleContent } from "@/lib/admin-runtime";
import { getProducts } from "@/lib/actions/product-actions";
import type { AppLocale } from "@/i18n/routing";

type ProductsPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function ProductsPage({ params }: ProductsPageProps) {
  const { locale } = (await params) as { locale: AppLocale };
  setRequestLocale(locale);
  const { admin, navigation, shell } = await getAdminLocaleContent(locale);
  const content = admin.products;
  
  // Lấy dữ liệu sản phẩm ban đầu từ Database
  const products = await getProducts();

  if (!content) {
    return null;
  }

  return (
    <AdminShell
      navigation={navigation}
      currentPath={getAdminPath(locale, "/admin/products")}
      title={content.title}
      description={content.description}
      badge={shell.badge}
      sidebarTitle={shell.sidebarTitle}
      sidebarDescription={shell.sidebarDescription}
    >
      {content.productManager ? (
        <ProductManager
          messages={content.productManager}
          initialProducts={products.map((p) => ({
            ...p,
            price: Number(p.price),
          }))}
        />
      ) : null}

      {/* Thông tin bổ trợ: Workflow & Next Step */}
      <div className="grid gap-6 md:grid-cols-2">
        <WorkflowCard
          title={content.workflow.title}
          description={shell.workflowDescription}
          steps={content.workflow.steps}
        />

        {content.nextStep ? (
            <NextStepBanner
                href={getAdminPath(locale, "/admin/reports")}
                label={content.nextStep.label}
                copy={content.nextStep.copy}
            />
        ) : null}
      </div>
    </AdminShell>
  );
}
