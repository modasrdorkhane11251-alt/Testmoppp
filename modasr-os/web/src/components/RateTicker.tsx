"use client";
import { useEffect, useState } from "react";
import { api, Rate } from "@/lib/api";

const LABEL: Record<string, string> = { USDT: "تتر", USD: "دلار", EUR: "یورو", TRY: "لیر", AED: "درهم" };

export default function RateTicker() {
  const [rates, setRates] = useState<Record<string, Rate>>({});
  useEffect(() => {
    const load = () => api<Record<string, Rate>>("/api/rates").then(setRates).catch(() => {});
    load(); const t = setInterval(load, 30_000); return () => clearInterval(t);
  }, []);
  const entries = Object.entries(rates);
  if (!entries.length) return null;
  const updated = entries[0][1].updated_at;
  return (
    <div className="glass flex flex-wrap items-center gap-x-8 gap-y-3 px-5 py-4">
      {entries.map(([k, r]) => (
        <div key={k} className="flex items-baseline gap-2">
          <span className={`h-2 w-2 rounded-full ${r.healthy ? "bg-cyan animate-pulseDot" : "bg-yellow-400"}`} />
          <span className="text-mist">{LABEL[k]}</span>
          <span className="num text-lg font-bold">{r.toman.toLocaleString("fa-IR")}</span>
        </div>
      ))}
      <span className="ms-auto text-sm text-mist">
        به‌روزرسانی {new Date(updated).toLocaleTimeString("fa-IR")} · {entries[0][1].sources.filter((s) => s.ok).map((s) => s.name).join("، ")}
      </span>
    </div>
  );
}
