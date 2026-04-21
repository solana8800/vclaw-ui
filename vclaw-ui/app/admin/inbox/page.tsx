import LocaleInboxPage from "@/app/[locale]/admin/inbox/page";

export default function DefaultInboxPage({
  searchParams,
}: {
  searchParams?: Promise<{ thread?: string }>;
}) {
  return (
    <LocaleInboxPage
      params={Promise.resolve({ locale: "vi" })}
      searchParams={searchParams ?? Promise.resolve({})}
    />
  );
}
