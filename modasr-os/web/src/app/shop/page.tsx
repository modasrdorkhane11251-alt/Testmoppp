import ProductCard from "@/components/ProductCard";
import { Product } from "@/lib/api";

export default async function Shop({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const qs = new URLSearchParams({ size: "24", ...sp }).toString();
  const r = await fetch(`${process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL}/api/products?${qs}`, { next: { revalidate: 30 } }).catch(() => null);
  const data: { items: Product[]; page: number } = r?.ok ? await r.json() : { items: [], page: 1 };
  const page = Number(sp.page ?? 1);
  return (
    <div className="space-y-8">
      <form className="glass flex flex-wrap gap-3 p-4">
        <input name="q" defaultValue={sp.q} className="input flex-1" placeholder="جستجوی محصول… (مثلاً ChatGPT یا اسپاتیفای)" />
        <select name="sort" defaultValue={sp.sort ?? "popular"} className="input w-auto">
          <option value="popular">پرفروش‌ترین</option><option value="new">جدیدترین</option>
          <option value="price_asc">ارزان‌ترین</option><option value="price_desc">گران‌ترین</option>
        </select>
        {sp.category && <input type="hidden" name="category" value={sp.category} />}
        <button className="btn-primary">اعمال</button>
      </form>
      {data.items.length ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{data.items.map((p) => <ProductCard key={p.id} p={p} />)}</div>
      ) : <p className="py-24 text-center text-mist">محصولی پیدا نشد.</p>}
      <div className="flex justify-center gap-3">
        {page > 1 && <a className="btn-ghost" href={`?${new URLSearchParams({ ...sp, page: String(page - 1) })}`}>قبلی</a>}
        {data.items.length === 24 && <a className="btn-ghost" href={`?${new URLSearchParams({ ...sp, page: String(page + 1) })}`}>بعدی</a>}
      </div>
    </div>
  );
}
