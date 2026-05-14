import { setRequestLocale } from "next-intl/server";
import { AdminShell, ListCard, NextStepBanner, WorkflowCard } from "@/components/admin/admin-shell";
import { ProductManager } from "@/components/admin/product-manager";
import { getAdminPath } from "@/lib/admin/content";
import { getAdminLocaleContent } from "@/lib/admin/runtime";
import { getProducts } from "@/lib/actions/product-actions";
import { AdminPagination } from "@/components/admin/admin-pagination";
import type { AppLocale } from "@/i18n/routing";
import type { Product } from "@prisma/client";

type ProductsPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
};

export default async function ProductsPage({ params, searchParams }: ProductsPageProps) {
  const { locale } = (await params) as { locale: AppLocale };
  const sp = await searchParams;
  const currentPage = Number(sp.page) || 1;

  setRequestLocale(locale);
  const { admin, navigation, shell } = await getAdminLocaleContent(locale);
  const content = admin.products;
  
  // Lấy dữ liệu sản phẩm ban đầu từ Database
  const { data: products, totalPages } = await getProducts(currentPage, 20);

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
        <div className="space-y-4 mb-6">
          <ProductManager
            messages={content.productManager}
            initialProducts={(products as Product[]).map((p: Product) => ({
              ...p,
              price: Number(p.price),
            }))}
          />
          <AdminPagination
            currentPage={currentPage}
            totalPages={totalPages}
            baseUrl={getAdminPath(locale, "/admin/products")}
          />
        </div>
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
