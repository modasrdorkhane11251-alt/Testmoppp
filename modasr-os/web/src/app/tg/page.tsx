"use client";
/** Telegram Mini App entry. Same UI as the website; auth via validated initData. */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { miniAppLogin, tg } from "@/lib/telegram";

export default function MiniApp() {
  const router = useRouter();
  const [err, setErr] = useState("");
  useEffect(() => {
    const w = tg();
    if (!w?.initData) { router.replace("/"); return; }
    miniAppLogin().then(() => {
      const start = w.initDataUnsafe.start_param ?? "";
      router.replace(start.startsWith("p_") ? `/p/${start.slice(2)}` : "/");
    }).catch((e) => setErr(e.message));
  }, [router]);
  return <div className="grid min-h-[60dvh] place-items-center text-center">
    {err ? <p className="text-yellow-400">{err}</p> : <div><div className="font-en text-3xl font-bold">MODASR<span className="text-cyan">·</span>HUB</div><p className="mt-3 text-mist">در حال ورود…</p></div>}
  </div>;
}
