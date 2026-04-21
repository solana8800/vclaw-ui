/**
 * URL cổng đối tác chính thức — mở tab mới để shop đăng nhập / lấy API (không webview điều khiển trong app).
 */
import type { IntegrationProvider } from "@/lib/integration-providers";

export const INTEGRATION_CONSOLE_URLS: Record<
  "zalo" | "facebook" | "shopee" | "ghtk" | "ghtkSeller" | "ghn",
  string
> = {
  zalo: "https://developers.zalo.me/docs/official-account/bat-dau/",
  facebook: "https://developers.facebook.com/docs/pages",
  shopee: "https://open.shopee.com/documents?module=63&type=2&id=53&version=2",
  ghtk: "https://docs.giaohangtietkiem.vn/",
  /** Cổng khách hàng GHTK — đăng nhập shop để lấy token API (sao chép vào VClaw). */
  ghtkSeller: "https://khachhang.giaohangtietkiem.vn/",
  ghn: "https://api.ghn.vn/home/docs",
};

/** Cổng nhà phát triển / bot — mở tab mới từ trang Tích hợp. */
export const INTEGRATION_DEV_PORTAL_BY_PROVIDER: Record<IntegrationProvider, string> = {
  ZALO: INTEGRATION_CONSOLE_URLS.zalo,
  META: INTEGRATION_CONSOLE_URLS.facebook,
  SHOPEE: INTEGRATION_CONSOLE_URLS.shopee,
  TELEGRAM: "https://t.me/BotFather",
};
