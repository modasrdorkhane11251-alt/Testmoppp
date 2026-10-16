"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TelegramLogin from "@/components/TelegramLogin";
import { api, toman } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { inTelegram, miniAppLogin } from "@/lib/telegram";

const METHODS = [["online", "درگاه آنلاین"], ["wallet", "کیف پول"], ["card_to_card", "کارت‌به‌کارت"]] as const;

export default function Checkout() {
  const { lines, coupon, clear } = useCart();
  const [authed, setAuthed] = useState(false);
  const [method, setMethod] = useState<(typeof METHODS)[number][0]>("online");
  const [total, setTotal] = useState<number>();
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const idem = useMemo(() => crypto.randomUUID(), []);
  const items = lines.map(({ sku, qty }) => ({ sku, qty }));

  useEffect(() => {
    setAuthed(!!localStorage.getItem("modasr_at"));
    if (inTelegram()) miniAppLogin().then(() => setAuthed(true)).catch(() => {});
    api<{ total: number }>("/api/quote", { method: "POST", body: JSON.stringify({ items, coupon }) }).then((q) => setTotal(q.total)).catch((e) => setMsg(e.message));
  }, []); // eslint-disable-line

  const pay = async () => {
    setBusy(true); setMsg("");
    try {
      const r = await api<any>("/api/checkout", { method: "POST", body: JSON.stringify({ items, coupon, method, expected_total: total,
        channel: inTelegram() ? "miniapp" : "web", affiliate_code: localStorage.getItem("modasr_ref"), idempotency_key: idem }) });
      if (r.price_changed) { setTotal(r.total); setMsg(`قیمت به‌روز شد: ${toman(r.total)}. دوباره تأیید کن.`); return; }
      clear();
      if (r.redirect) location.href = r.redirect;
      else if (r.status === "awaiting_receipt") router.push(`/dashboard?tab=orders&receipt=${r.payment_id}`);
      else router.push(`/payment/result?status=ok&order=${r.order}`);
    } catch (e: any) { setMsg(e.message); } finally { setBusy(false); }
  };

  if (!authed) return <div className="glass mx-auto max-w-md space-y-6 p-8 text-center"><h1 className="text-2xl font-black">ورود با تلگرام</h1>
    <p className="text-mist">برای ثبت سفارش، یک کلیک با حساب تلگرامت وارد شو.</p><TelegramLogin onDone={() => setAuthed(true)} /></div>;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-3xl font-black">پرداخت</h1>
      <div className="grid gap-3">
        {METHODS.map(([k, label]) => (
          <button key={k} onClick={() => setMethod(k)} className={`glass p-5 text-start ${method === k ? "border-cyan shadow-neon" : ""}`}>{label}</button>
        ))}
      </div>
      <div className="glass flex items-center justify-between p-5 text-xl font-black"><span>مبلغ نهایی</span><span className="num text-cyan">{toman(total)}</span></div>
      {msg && <p className="text-yellow-400">{msg}</p>}
      <button className="btn-primary w-full text-lg" disabled={busy || !total} onClick={pay}>{busy ? "در حال انتقال…" : "پرداخت"}</button>
    </div>
  );
}
