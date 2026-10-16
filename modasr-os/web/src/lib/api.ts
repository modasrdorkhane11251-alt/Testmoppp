const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type Variant = { sku: string; name: string; price: number | null; in_stock: boolean; duration_days?: number; region?: string; delivery: string; warranty_days: number };
export type Product = { id: string; slug: string; title: string; title_en?: string; short?: string; images: string[]; price_from: number | null; in_stock: boolean; featured: boolean; variants: Variant[]; description?: string; faq?: { q: string; a: string }[]; specs?: Record<string, string>; related?: Product[] };
export type Rate = { toman: number; healthy: boolean; updated_at: string; sources: { name: string; ok: boolean; ms: number }[] };

const token = () => (typeof window !== "undefined" ? localStorage.getItem("modasr_at") : null);

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  const t = token();
  if (t) headers.set("Authorization", `Bearer ${t}`);
  const r = await fetch(`${API}${path}`, { ...init, headers, cache: "no-store" });
  if (r.status === 401 && typeof window !== "undefined") localStorage.removeItem("modasr_at");
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail ?? `HTTP ${r.status}`);
  return r.json();
}

export const toman = (n?: number | null) => (n ? `${n.toLocaleString("fa-IR")} تومان` : "استعلام");
export const saveSession = (s: { access_token: string; refresh_token: string }) => {
  localStorage.setItem("modasr_at", s.access_token);
  localStorage.setItem("modasr_rt", s.refresh_token);
};
