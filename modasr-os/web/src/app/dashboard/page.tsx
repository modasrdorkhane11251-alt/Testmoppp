"use client";
import { useEffect, useState } from "react";
import TelegramLogin from "@/components/TelegramLogin";
import { api, toman } from "@/lib/api";

const TABS = [["orders", "سفارش‌ها"], ["wallet", "کیف پول"], ["tickets", "تیکت‌ها"], ["profile", "پروفایل"]] as const;

export default function Dashboard() {
  const [me, setMe] = useState<any>();
  const [tab, setTab] = useState<string>("orders");
  const [data, setData] = useState<any>();
  const [detail, setDetail] = useState<any>();
  useEffect(() => { api("/api/me").then(setMe).catch(() => setMe(null)); setTab(new URLSearchParams(location.search).get("tab") ?? "orders"); }, []);
  useEffect(() => { if (!me) return; setData(undefined);
    const path = { orders: "/api/my/orders", wallet: "/api/my/wallet", tickets: "/api/tickets", profile: "/api/me" }[tab]!;
    api(path).then(setData).catch(() => {}); }, [tab, me]);
  if (me === null) return <div className="glass mx-auto max-w-md space-y-6 p-8 text-center"><h1 className="text-2xl font-black">ورود به حساب</h1><TelegramLogin onDone={() => location.reload()} /></div>;
  if (!me) return null;
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        {me.telegram?.photo_url && <img src={me.telegram.photo_url} alt="" className="h-14 w-14 rounded-full" />}
        <div><h1 className="text-2xl font-black">{me.name ?? "کاربر MODASR"} {me.vip && <span className="text-violet">· VIP</span>}</h1>
          <p className="num text-mist">موجودی: {toman(me.wallet)}</p></div>
      </div>
      <div className="flex gap-2 overflow-x-auto">{TABS.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={k === tab ? "btn-primary" : "btn-ghost"}>{l}</button>)}</div>
      {tab === "orders" && Array.isArray(data) && <div className="space-y-3">{data.map((o: any) => (
        <button key={o.number} onClick={() => api(`/api/my/orders/${o.number}`).then(setDetail)} className="glass flex w-full justify-between p-5 text-start">
          <span className="num">#{o.number}</span><span>{o.status}</span><span className="num text-cyan">{toman(o.total)}</span></button>))}
        {detail && <div className="glass space-y-3 p-5">{detail.items.map((i: any) => (<div key={i.title}><b>{i.title}</b>
          {i.delivery && <pre dir="ltr" className="mt-2 select-all rounded-xl bg-black/40 p-3 font-en text-cyan">{i.delivery}</pre>}</div>))}</div>}</div>}
      {tab === "wallet" && data?.transactions && <div className="space-y-2">{data.transactions.map((t: any, i: number) => (
        <div key={i} className="glass flex justify-between p-4"><span>{t.type}</span><span className={`num ${t.amount > 0 ? "text-cyan" : "text-mist"}`}>{toman(Math.abs(t.amount))}</span></div>))}</div>}
      {tab === "tickets" && Array.isArray(data) && <div className="space-y-2">{data.map((t: any) => (
        <div key={t.id} className="glass flex justify-between p-4"><span>{t.subject}</span><span className="text-mist">{t.status}</span></div>))}</div>}
    </div>
  );
}
