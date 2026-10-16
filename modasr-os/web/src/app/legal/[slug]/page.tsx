import { notFound } from "next/navigation";
const TITLES: Record<string, string> = { about: "درباره ما", contact: "تماس", terms: "قوانین", privacy: "حریم خصوصی", refund: "بازگشت وجه", faq: "سؤالات متداول" };
export default async function Legal({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!TITLES[slug]) notFound();
  const r = await fetch(`${process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL}/api/kb/${slug}`, { next: { revalidate: 300 } }).catch(() => null);
  const a = r?.ok ? await r.json() : { body: "" };
  return <article className="glass mx-auto max-w-3xl space-y-6 p-10"><h1 className="text-3xl font-black">{TITLES[slug]}</h1><div className="whitespace-pre-wrap leading-9 text-mist">{a.body}</div></article>;
}
