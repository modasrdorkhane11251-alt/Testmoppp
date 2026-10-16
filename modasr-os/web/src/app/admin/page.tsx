"use client";
import { useEffect, useState } from "react";
import { api, toman } from "@/lib/api";

export default function Admin() {
  const [d, setD] = useState<any>();
  const [props, setProps] = useState<any[]>([]);
  const [cmd, setCmd] = useState("");
  const [log, setLog] = useState<{ q: string; a: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const load = () => { api("/admin/dashboard").then(setD).catch(() => setD(null)); api<any[]>("/admin/ai/proposals").then(setProps).catch(() => {}); };
  useEffect(load, []);
  const ask = async (q = cmd) => { if (!q) return; setBusy(true); setCmd("");
    try { const r = await api<{ reply: string }>("/admin/ai/command", { method: "POST", body: JSON.stringify({ text: q }) }); setLog((l) => [{ q, a: r.reply }, ...l]); load(); }
    finally { setBusy(false); } };
  const decide = (id: string, d: "approve" | "reject") => api(`/admin/ai/proposals/${id}/${d}`, { method: "POST" }).then(load);
  if (d === null) return <p className="py-32 text-center text-mist">دسترسی ادمین لازم است.</p>;
  if (!d) return null;
  const kpis: [string, string][] = [["درآمد ۲۴ ساعت", toman(d.revenue_24h)], ["سود ۲۴ ساعت", toman(d.profit_24h)], ["سفارش", String(d.orders_24h)],
    ["حل خودکار تیکت", `${Math.round(d.ai_resolution_rate * 100)}٪`]];
  return (
    <div className="space-y-10">
      <section className="glass space-y-4 p-6 shadow-violet">
        <h1 className="text-2xl font-black">به MODASR AI CORE بگو چی کار کنه</h1>
        <form onSubmit={(e) => { e.preventDefault(); ask(); }} className="flex gap-2">
          <input value={cmd} onChange={(e) => setCmd(e.target.value)} className="input text-lg" placeholder="مثلاً: درآمد امروز چقدره؟ یا یک کمپین ۲۰٪ برای تلگرام پرمیوم بساز" />
          <button className="btn-primary" disabled={busy}>{busy ? "…" : "اجرا"}</button>
        </form>
        <div className="flex flex-wrap gap-2">{["درآمد امروز", "پرفروش‌های این هفته", "تیکت‌های حل‌نشده", "گزارش ماهانه", "یک کمپین ۲۰٪ پیشنهاد بده"].map((s) => (
          <button key={s} onClick={() => ask(s)} className="rounded-full border border-white/15 px-4 py-2 text-sm hover:border-cyan">{s}</button>))}</div>
        {log.map((l, i) => <div key={i} className="rounded-xl bg-black/30 p-4"><p className="text-mist">{l.q}</p><p className="mt-2 whitespace-pre-wrap leading-8">{l.a}</p></div>)}
      </section>
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">{kpis.map(([k, v]) => (
        <div key={k} className="glass p-5"><p className="text-sm text-mist">{k}</p><p className="num mt-2 text-2xl font-black">{v}</p></div>))}</section>
      <section className="grid gap-6 md:grid-cols-2">
        <div className="glass space-y-3 p-6"><h2 className="text-xl font-black">منتظر تأیید شما ({props.length})</h2>
          {props.map((p) => (<div key={p.id} className="rounded-xl border border-white/10 p-4"><b>{p.action}</b>
            <p className="mt-1 text-sm text-mist">{p.payload.rationale}</p>
            <div className="mt-3 flex gap-2"><button onClick={() => decide(p.id, "approve")} className="btn-primary !py-2">تأیید</button>
              <button onClick={() => decide(p.id, "reject")} className="btn-ghost !py-2">رد</button></div></div>))}
          {!props.length && <p className="text-mist">همه‌چیز تحت کنترل AI است ✨</p>}</div>
        <div className="glass space-y-3 p-6"><h2 className="text-xl font-black">تأمین‌کننده‌ها</h2>
          {d.suppliers.map((s: any) => (<div key={s.name} className="flex justify-between"><span>{s.healthy ? "🟢" : "🔴"} {s.name}</span><span className="num text-mist">{s.latency_ms ?? "-"}ms</span></div>))}
          <p className="pt-2 text-sm text-mist">صف تحویل دستی: {d.fulfillment_queue} · تیکت انسانی: {d.human_tickets}</p></div>
      </section>
    </div>
  );
}
