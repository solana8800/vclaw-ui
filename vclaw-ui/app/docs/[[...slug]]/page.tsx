import LocaleDocPage from "@/app/[locale]/docs/[[...slug]]/page";

type DefaultDocPageProps = {
  params: Promise<{ slug?: string[] }>;
};

export default async function DefaultDocPage({ params }: DefaultDocPageProps) {
  const { slug } = await params;

  return (
    <LocaleDocPage params={Promise.resolve({ locale: "vi", slug })} />
  );
}
