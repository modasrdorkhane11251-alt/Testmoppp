"use client";
import { useEffect, useRef } from "react";
import { api, saveSession } from "@/lib/api";

/** Official Telegram Login Widget. The hash is verified on the server (never trusted client-side). */
export default function TelegramLogin({ onDone }: { onDone?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    (window as any).onTelegramAuth = async (user: Record<string, string | number>) => {
      const s = await api<any>("/api/auth/telegram/widget", { method: "POST", body: JSON.stringify(user) });
      if (s.requires_2fa) { sessionStorage.setItem("modasr_2fa", s.challenge); location.href = "/login/2fa"; return; }
      saveSession(s); onDone?.();
    };
    const sc = document.createElement("script");
    sc.src = "https://telegram.org/js/telegram-widget.js?22";
    sc.async = true;
    sc.setAttribute("data-telegram-login", process.env.NEXT_PUBLIC_TG_BOT_USERNAME ?? "modasrhub_bot");
    sc.setAttribute("data-size", "large");
    sc.setAttribute("data-radius", "12");
    sc.setAttribute("data-onauth", "onTelegramAuth(user)");
    sc.setAttribute("data-request-access", "write");
    ref.current?.appendChild(sc);
    return () => { sc.remove(); };
  }, [onDone]);
  return <div ref={ref} className="flex justify-center" />;
}
