/** Suy workspace admin từ URL — dùng cho sidebar / workspace switcher. */
export function detectAdminIndustryFromPath(
  path: string,
): "RETAIL" | "HEAD_HUNTER" {
  const p = path.split("?")[0]?.split("#")[0] ?? "";

  if (p.includes("/admin/recruitment")) {
    return "HEAD_HUNTER";
  }

  const isRetailSettings = /\/admin\/settings\/?$/.test(p);
  const isRetailPath =
    p.includes("/admin/customers") ||
    p.includes("/admin/orders") ||
    p.includes("/admin/products") ||
    p.includes("/admin/bookings") ||
    p.includes("/admin/zalouser") ||
    isRetailSettings ||
    /\/admin\/?$/.test(p);

  if (isRetailPath) {
    return "RETAIL";
  }

  return "RETAIL";
}
