import { NextResponse } from "next/server";

/**
 * next-intl `createMiddleware` rewrites requests for `app/[locale]`.
 * Until Task 2 migrates routes under `[locale]`, a no-op keeps existing
 * unprefixed URLs working. `i18n/routing` and `createNavigation` remain
 * for helpers and for wiring in Task 2.
 */
export default function proxy() {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
