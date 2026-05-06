import { revalidatePath } from "next/cache";

const paths = [
  "/admin",
  "/en/admin",
  "/vi/admin",
  "/vi/admin/customers",
  "/en/admin/customers",
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
  "/admin/shipping",
  "/en/admin/shipping",
  "/admin/zalouser",
  "/en/admin/zalouser",
  "/vi/admin/zalouser",
  "/admin/automation",
  "/en/admin/automation",
  "/admin/reports",
  "/en/admin/reports",
];

export function revalidateAdminPaths() {
  try {
    for (const p of paths) {
      revalidatePath(p);
    }
  } catch (e) {
    // Bỏ qua lỗi nếu chạy ngoài request context (ví dụ: chạy trong background worker)
    if (e instanceof Error && e.message.includes("static generation store missing")) {
      return;
    }
    console.warn("[Revalidate] Không thể revalidate paths:", e);
  }
}
