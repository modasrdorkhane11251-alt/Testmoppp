"use client";
import { api, saveSession } from "./api";

type TgWebApp = { initData: string; initDataUnsafe: { start_param?: string; user?: { first_name: string } }; ready(): void; expand(): void;
  MainButton: { setText(t: string): void; show(): void; hide(): void; onClick(f: () => void): void; offClick(f: () => void): void };
  BackButton: { show(): void; hide(): void; onClick(f: () => void): void }; HapticFeedback: { impactOccurred(s: string): void; notificationOccurred(s: string): void };
  colorScheme: string; setHeaderColor(c: string): void; setBackgroundColor(c: string): void };

export const tg = (): TgWebApp | null => (typeof window !== "undefined" ? (window as any).Telegram?.WebApp ?? null : null);
export const inTelegram = () => !!tg()?.initData;

export async function miniAppLogin() {
  const w = tg();
  if (!w?.initData) return null;
  w.ready(); w.expand(); w.setHeaderColor("#050816"); w.setBackgroundColor("#050816");
  const s = await api<any>("/api/auth/telegram/webapp", { method: "POST", body: JSON.stringify({ init_data: w.initData }) });
  if (s.access_token) saveSession(s);
  const ref = w.initDataUnsafe.start_param;
  if (ref?.startsWith("ref_")) localStorage.setItem("modasr_ref", ref.slice(4));
  return s;
}

export const haptic = (kind: "light" | "success" = "light") =>
  kind === "success" ? tg()?.HapticFeedback.notificationOccurred("success") : tg()?.HapticFeedback.impactOccurred("light");
