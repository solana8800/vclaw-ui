import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Matcher cho i18n (next-intl proxy): bỏ qua api, _next và file tĩnh
  matcher: [
    "/(vi|en)/:path*",
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
