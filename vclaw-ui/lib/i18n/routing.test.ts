import { describe, expect, it } from "vitest";

import { getLocaleHref, isSupportedLocale } from "@/i18n/routing";

describe("i18n routing", () => {
  it("treats vi as the default locale without a prefix", () => {
    expect(getLocaleHref("vi", "/admin/orders")).toBe("/admin/orders");
    expect(getLocaleHref("vi", "/")).toBe("/");
  });

  it("prefixes english routes with /en", () => {
    expect(getLocaleHref("en", "/admin/orders")).toBe("/en/admin/orders");
    expect(getLocaleHref("en", "/")).toBe("/en");
  });

  it("normalizes pathnames that already include /en", () => {
    expect(getLocaleHref("vi", "/en/admin/orders")).toBe("/admin/orders");
    expect(getLocaleHref("vi", "/en")).toBe("/");
    expect(getLocaleHref("en", "/en/admin/orders")).toBe("/en/admin/orders");
  });

  it("does not treat /en as a prefix inside unrelated path segments", () => {
    expect(getLocaleHref("vi", "/energy")).toBe("/energy");
    expect(getLocaleHref("en", "/energy")).toBe("/en/energy");
  });

  it("accepts only configured locales", () => {
    expect(isSupportedLocale("vi")).toBe(true);
    expect(isSupportedLocale("en")).toBe(true);
    expect(isSupportedLocale("fr")).toBe(false);
  });
});
