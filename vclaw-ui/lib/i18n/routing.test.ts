import { describe, expect, it } from "vitest";

import { getLocaleHref, isSupportedLocale } from "@/i18n/routing";

describe("i18n routing", () => {
  it("prefixes vietnamese routes with /vi (localePrefix: always)", () => {
    expect(getLocaleHref("vi", "/admin/orders")).toBe("/vi/admin/orders");
    expect(getLocaleHref("vi", "/")).toBe("/vi");
  });

  it("prefixes english routes with /en", () => {
    expect(getLocaleHref("en", "/admin/orders")).toBe("/en/admin/orders");
    expect(getLocaleHref("en", "/")).toBe("/en");
  });

  it("normalizes pathnames that already include /en or /vi", () => {
    expect(getLocaleHref("vi", "/en/admin/orders")).toBe("/vi/admin/orders");
    expect(getLocaleHref("vi", "/en")).toBe("/vi");
    expect(getLocaleHref("en", "/en/admin/orders")).toBe("/en/admin/orders");
    expect(getLocaleHref("en", "/vi/admin")).toBe("/en/admin");
  });

  it("does not treat /en as a prefix inside unrelated path segments", () => {
    expect(getLocaleHref("vi", "/energy")).toBe("/vi/energy");
    expect(getLocaleHref("en", "/energy")).toBe("/en/energy");
  });

  it("accepts only configured locales", () => {
    expect(isSupportedLocale("vi")).toBe(true);
    expect(isSupportedLocale("en")).toBe(true);
    expect(isSupportedLocale("fr")).toBe(false);
  });
});
