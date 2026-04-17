import { getAllDocs } from "@/lib/docs";
import { locales } from "@/i18n/routing";
import LocaleDocPage from "@/app/[locale]/docs/[[...slug]]/page";

export function generateStaticParams() {
  const params: Array<{ slug?: string[] }> = [];

  // Thêm trang chủ docs (không có slug)
  params.push({ slug: [] });

  // Thêm tất cả các trang con (mặc định lấy locale 'vi' cho root docs)
  const docs = getAllDocs("vi");
  for (const doc of docs) {
    params.push({ slug: doc.slug });
  }

  return params;
}

type DefaultDocPageProps = {
  params: Promise<{ slug?: string[] }>;
};

export default async function DefaultDocPage({ params }: DefaultDocPageProps) {
  const { slug } = await params;

  return (
    <LocaleDocPage params={Promise.resolve({ locale: "vi", slug })} />
  );
}
