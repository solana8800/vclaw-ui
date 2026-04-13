import LocaleOnboardingPage from "@/app/[locale]/admin/onboarding/page";

export default function DefaultOnboardingPage() {
  return <LocaleOnboardingPage params={Promise.resolve({ locale: "vi" })} />;
}
