"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, toman } from "@/lib/api";
import { useCart } from "@/lib/cart";

type Quote = { subtotal: number; discount: number; total: number; coupon: string | null };

export default function CartPage() {
  const { lines, coupon, setQty, remove, setCoupon } = useCart();
  const [q, setQ] = useState<Quote>();
  const [code, setCode] = useState(coupon ?? "");
  const [err, setErr] = useState("");
  useEffect(() => {
    if (!lines.length) return setQ(undefined);
    api<Quote>("/api/quote", { method: "POST", body: JSON.stringify({ items: lines.map(({ sku, qty }) => ({ sku, qty })), coupon }) })
      .then((r) => { setQ(r); setErr(""); }).catch((e) => setErr(e.message));
  }, [lines, coupon]);
  if (!lines.length) return <div className="py-32 text-center"><p className="text-xl text-mist">سبدت خالیه.</p><Link href="/shop" className="btn-primary mt-6">بریم خرید</Link></div>;
  return (
    <div className="grid gap-8 md:grid-cols-[1fr_380px]">
      <div className="space-y-3">
        {lines.map((l) => (
          <div key={l.sku} className="glass flex items-center gap-4 p-4">
            <div className="flex-1"><div className="font-bold">{l.title}</div><div className="num text-cyan">{toman(l.price)}</div></div>
            <input type="number" min={1} max={20} value={l.qty} onChange={(e) => setQty(l.sku, Number(e.target.value))} className="input num w-20 text-center" />
            <button onClick={() => remove(l.sku)} className="text-mist hover:text-red-400">حذف</button>
          </div>
        ))}
      </div>
      <aside className="glass h-fit space-y-4 p-6">
        <div className="flex gap-2"><input value={code} onChange={(e) => setCode(e.target.value)} className="input" placeholder="کد تخفیف" />
          <button onClick={() => setCoupon(code || undefined)} className="btn-ghost">اعمال</button></div>
        {q && <>
          <Row k="جمع" v={toman(q.subtotal)} />{q.discount > 0 && <Row k={`تخفیف (${q.coupon})`} v={`− ${toman(q.discount)}`} />}
          <Row k="قابل پرداخت" v={toman(q.total)} big /></>}
        {err && <p className="text-sm text-yellow-400">{err}</p>}
        <Link href="/checkout" className="btn-primary w-full">ادامه و پرداخت</Link>
      </aside>
    </div>
  );
}
const Row = ({ k, v, big }: { k: string; v: string; big?: boolean }) => (
  <div className={`flex justify-between ${big ? "border-t border-white/10 pt-4 text-lg font-black" : "text-mist"}`}><span>{k}</span><span className="num">{v}</span></div>
);
