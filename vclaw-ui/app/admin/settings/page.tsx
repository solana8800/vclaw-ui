import LocaleSettingsPage from "@/app/[locale]/admin/settings/page";

export default function DefaultSettingsPage() {
  return <LocaleSettingsPage params={Promise.resolve({ locale: "vi" })} />;
}
