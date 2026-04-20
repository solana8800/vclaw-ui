import LocaleAdminGuidePage from "@/app/[locale]/admin/guide/page";

export default function DefaultAdminGuidePage() {
  return <LocaleAdminGuidePage params={Promise.resolve({ locale: "vi" })} />;
}
