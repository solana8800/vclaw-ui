import LocaleAutomationPage from "@/app/[locale]/admin/automation/page";

export default function DefaultAutomationPage() {
  return <LocaleAutomationPage params={Promise.resolve({ locale: "vi" })} />;
}
