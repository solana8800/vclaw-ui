import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { NextRequest } from "next/server";

const handleI18nRouting = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Chỉ can thiệp khi truy cập trang chủ hoặc các đường dẫn chưa có locale prefix
  if (pathname === "/") {
    const country = (request.nextUrl.searchParams.get("country") ||
                     request.headers.get("x-vercel-ip-country") || 
                     request.headers.get("cf-ipcountry"))?.toUpperCase();
    
    if (country) {
      const targetLocale = country === "VN" ? "vi" : "en";
      
      // Nếu browser đã có cookie locale, ưu tiên cookie
      const hasLocaleCookie = request.cookies.has("NEXT_LOCALE");
      
      if (!hasLocaleCookie) {
        // Chèn header Accept-Language để next-intl nhận diện đúng locale theo quốc gia
        // thay vì dựa trên cài đặt trình duyệt nếu chưa có cookie
        request.headers.set("accept-language", targetLocale === "vi" ? "vi-VN,vi;q=0.9" : "en-US,en;q=0.9");
      }
    }
  }

  return handleI18nRouting(request);
}

export const config = {
  // Matcher cho i18n (next-intl proxy): bỏ qua api, _next và file tĩnh
  matcher: [
    "/",
    "/(vi|en)/:path*",
    "/admin/:path*",
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
