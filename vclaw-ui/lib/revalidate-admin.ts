import { revalidatePath } from "next/cache";

const paths = [
  "/admin",
  "/en/admin",
  "/admin/products",
  "/en/admin/products",
  "/admin/customers",
  "/en/admin/customers",
  "/admin/orders",
  "/en/admin/orders",
  "/admin/payments",
  "/en/admin/payments",
  "/admin/bookings",
  "/en/admin/bookings",
  "/admin/onboarding",
  "/en/admin/onboarding",
  "/admin/shipping",
  "/en/admin/shipping",
  "/admin/integrations",
  "/en/admin/integrations",
  "/admin/automation",
  "/en/admin/automation",
  "/admin/reports",
  "/en/admin/reports",
];

export function revalidateAdminPaths() {
  for (const p of paths) {
    revalidatePath(p);
  }
}
