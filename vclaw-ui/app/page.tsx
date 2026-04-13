import LocaleHomePage from "@/app/[locale]/page";
import { LocaleShell } from "@/components/app/locale-shell";

export default function DefaultHomePage() {
  return (
    <LocaleShell locale="vi">
      <LocaleHomePage params={Promise.resolve({ locale: "vi" })} />
    </LocaleShell>
  );
}
