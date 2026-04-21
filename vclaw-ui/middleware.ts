import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Matcher cho i18n middleware, bỏ qua các thư mục api, _next và các file tĩnh
  matcher: [
    // Bắt các đường dẫn có locale prefix
    "/(vi|en)/:path*",
    
    // Bắt các đường dẫn không có locale prefix (vì localePrefix: 'as-needed')
    // Loại bỏ các đường dẫn api, tài nguyên tĩnh, nội bộ của next/vercel
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
