import LocaleInboxPage from "@/app/[locale]/admin/inbox/page";

export default function DefaultInboxPage() {
  return <LocaleInboxPage params={Promise.resolve({ locale: "vi" })} />;
}
