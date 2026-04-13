import LocaleIntegrationsPage from "@/app/[locale]/admin/integrations/page";

export default function DefaultIntegrationsPage() {
  return <LocaleIntegrationsPage params={Promise.resolve({ locale: "vi" })} />;
}
