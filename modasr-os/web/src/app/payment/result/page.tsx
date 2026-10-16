import Link from "next/link";

const COPY: Record<string, [string, string]> = {
  ok: ["✅", "پرداخت موفق بود"], cancel: ["↩️", "پرداخت لغو شد"], fail: ["❌", "پرداخت ناموفق بود"], error: ["⚠️", "تراکنش پیدا نشد"],
};

export default async function Result({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const [icon, title] = COPY[sp.status] ?? COPY.error;
  return (
    <div className="glass mx-auto max-w-lg space-y-5 p-10 text-center">
      <div className="text-6xl">{icon}</div>
      <h1 className="text-3xl font-black">{title}</h1>
      {sp.order && <p className="num text-mist">سفارش #{sp.order}{sp.ref ? ` · کد رهگیری ${sp.ref}` : ""}</p>}
      <div className="flex justify-center gap-3">
        {sp.order && <Link href={`/dashboard?tab=orders&order=${sp.order}`} className="btn-primary">مشاهده سفارش</Link>}
        <Link href="/shop" className="btn-ghost">ادامه خرید</Link>
      </div>
    </div>
  );
}
