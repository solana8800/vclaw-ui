import LocalePage from "@/app/[locale]/admin/zalouser/page";

export default function DefaultOpenclawZalouserPage() {
  return <LocalePage params={Promise.resolve({ locale: "vi" })} />;
}
