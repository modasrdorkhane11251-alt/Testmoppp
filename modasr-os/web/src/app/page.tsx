import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import RateTicker from "@/components/RateTicker";
import { Product } from "@/lib/api";

async function load<T>(path: string, fallback: T): Promise<T> {
  try { const r = await fetch(`${process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL}${path}`, { next: { revalidate: 60 } }); return r.ok ? r.json() : fallback; }
  catch { return fallback; }
}

export default async function Home() {
  const [featured, popular, cats] = await Promise.all([
    load<{ items: Product[] }>("/api/products?featured=true&size=8", { items: [] }),
    load<{ items: Product[] }>("/api/products?sort=popular&size=8", { items: [] }),
    load<{ slug: string; name: string; icon?: string; parent_id: string | null }[]>("/api/categories", []),
  ]);
  return (
    <div className="space-y-16">
      <section className="grid items-center gap-10 pt-6 md:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="font-en text-sm tracking-[.3em] text-cyan">AI-FIRST COMMERCE</p>
          <h1 className="mt-4 text-5xl font-black leading-[1.25] md:text-7xl">
            اشتراکت رو بگیر،<br /><span className="bg-gradient-to-l from-cyan to-violet bg-clip-text text-transparent">بقیه‌ش با ما.</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-9 text-mist">تحویل فوری، قیمت لحظه‌ای با نرخ زنده، و دستیاری که ساعت ۳ صبح هم جواب می‌ده.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/shop" className="btn-primary">ورود به فروشگاه</Link>
            <a href={`https://t.me/${process.env.NEXT_PUBLIC_TG_BOT_USERNAME ?? "modasrhub_bot"}`} className="btn-ghost">باز کردن در تلگرام</a>
          </div>
        </div>
        <div className="glass relative aspect-square overflow-hidden p-8 shadow-violet">
          <div className="absolute inset-0 bg-[conic-gradient(from_200deg,#00F0FF22,transparent_40%,#B026FF33,transparent_80%)]" />
          <div className="relative grid h-full grid-cols-2 gap-4">
            {featured.items.slice(0, 4).map((p) => (
              <div key={p.id} className="glass flex flex-col justify-end p-4">
                <span className="text-sm text-mist">{p.title}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <RateTicker />

      {!!cats.length && (
        <section>
          <h2 className="mb-6 text-2xl font-black">دسته‌بندی‌ها</h2>
          <div className="flex flex-wrap gap-3">
            {cats.filter((c) => !c.parent_id).map((c) => (
              <Link key={c.slug} href={`/shop?category=${c.slug}`} className="glass px-5 py-3 hover:border-cyan/50">{c.icon} {c.name}</Link>
            ))}
          </div>
        </section>
      )}

      {[["پیشنهاد ویژه", featured.items], ["پرفروش‌ها", popular.items]].map(([title, items]) => (
        (items as Product[]).length ? (
          <section key={title as string}>
            <div className="mb-6 flex items-end justify-between"><h2 className="text-2xl font-black">{title as string}</h2><Link href="/shop" className="text-cyan">همه</Link></div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{(items as Product[]).map((p) => <ProductCard key={p.id} p={p} />)}</div>
          </section>
        ) : null
      ))}

      <section className="grid gap-4 md:grid-cols-3">
        {[["⚡️", "تحویل خودکار", "کد و اکانت همان لحظه بعد از پرداخت"], ["🛡", "ضمانت واقعی", "شرایط بازگشت وجه شفاف برای هر محصول"], ["🤖", "پشتیبانی ۲۴ ساعته", "دستیار هوشمند + پشتیبان انسانی"]].map(([i, t, d]) => (
          <div key={t} className="glass p-6"><div className="text-3xl">{i}</div><h3 className="mt-3 text-lg font-bold">{t}</h3><p className="mt-2 text-mist">{d}</p></div>
        ))}
      </section>
    </div>
  );
}
