"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type Line = { sku: string; qty: number; title: string; price: number };
type Cart = { lines: Line[]; coupon?: string; add: (l: Line) => void; remove: (sku: string) => void; setQty: (sku: string, q: number) => void; setCoupon: (c?: string) => void; clear: () => void };

export const useCart = create<Cart>()(persist((set) => ({
  lines: [],
  add: (l) => set((s) => { const ex = s.lines.find((x) => x.sku === l.sku); return { lines: ex ? s.lines.map((x) => x.sku === l.sku ? { ...x, qty: Math.min(20, x.qty + l.qty) } : x) : [...s.lines, l] }; }),
  remove: (sku) => set((s) => ({ lines: s.lines.filter((x) => x.sku !== sku) })),
  setQty: (sku, q) => set((s) => ({ lines: s.lines.map((x) => x.sku === sku ? { ...x, qty: Math.max(1, Math.min(20, q)) } : x) })),
  setCoupon: (coupon) => set({ coupon }),
  clear: () => set({ lines: [], coupon: undefined }),
}), { name: "modasr_cart" }));
