import { notFound } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import { Product } from "@/lib/api";
import Buy from "./Buy";
import AIChat from "@/components/AIChat";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = await fetch(`${process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL}/api/products/${slug}`, { next: { revalidate: 30 } }).catch(() => null);
  if (!r?.ok) notFound();
  const p: Product = await r.json();
  return (
    <div className="space-y-14">
      <div className="grid gap-10 md:grid-cols-2">
        <div className="glass aspect-square overflow-hidden">{p.images[0] && <img src={p.images[0]} alt={p.title} className="h-full w-full object-cover" />}</div>
        <div className="space-y-6">
          <h1 className="text-4xl font-black leading-tight">{p.title}</h1>
          {p.title_en && <p className="font-en text-mist">{p.title_en}</p>}
          <p className="text-lg leading-9 text-mist">{p.short}</p>
          <Buy product={p} />
          {p.specs && <dl className="glass grid grid-cols-2 gap-3 p-5 text-sm">{Object.entries(p.specs).map(([k, v]) => (<div key={k}><dt className="text-mist">{k}</dt><dd className="font-bold">{v}</dd></div>))}</dl>}
        </div>
      </div>
      {p.description && <article className="glass max-w-none whitespace-pre-wrap p-8 leading-9">{p.description}</article>}
      <div className="grid gap-8 md:grid-cols-2">
        {!!p.faq?.length && <section className="space-y-3"><h2 className="text-2xl font-black">سؤالات متداول</h2>
          {p.faq.map((f) => <details key={f.q} className="glass p-5"><summary className="cursor-pointer font-bold">{f.q}</summary><p className="mt-3 leading-8 text-mist">{f.a}</p></details>)}</section>}
        <AIChat compact context={`کاربر درباره محصول «${p.title}» سؤال دارد.`} />
      </div>
      {!!p.related?.length && <section><h2 className="mb-6 text-2xl font-black">محصولات مرتبط</h2><div className="grid grid-cols-2 gap-4 md:grid-cols-4">{p.related.map((x) => <ProductCard key={x.id} p={x} />)}</div></section>}
    </div>
  );
}
