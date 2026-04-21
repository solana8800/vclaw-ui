import LocaleIntegrationsPage from "@/app/[locale]/admin/integrations/page";

export default function DefaultIntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ channel?: string }>;
}) {
  return (
    <LocaleIntegrationsPage
      params={Promise.resolve({ locale: "vi" })}
      searchParams={searchParams}
    />
  );
}
