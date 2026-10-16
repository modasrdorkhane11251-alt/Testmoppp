"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Product, toman } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { haptic } from "@/lib/telegram";

export default function Buy({ product }: { product: Product }) {
  const [sku, setSku] = useState(product.variants.find((v) => v.in_stock)?.sku ?? product.variants[0]?.sku);
  const add = useCart((s) => s.add);
  const router = useRouter();
  const v = product.variants.find((x) => x.sku === sku);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {product.variants.map((x) => (
          <button key={x.sku} disabled={!x.in_stock} onClick={() => setSku(x.sku)}
            className={`glass p-4 text-start transition ${x.sku === sku ? "border-cyan shadow-neon" : ""} disabled:opacity-40`}>
            <div className="font-bold">{x.name}</div>
            <div className="num mt-1 text-cyan">{toman(x.price)}</div>
            <div className="mt-1 text-xs text-mist">{x.delivery === "instant_code" ? "⚡️ تحویل فوری" : "⏱ تحویل دستی"}{x.warranty_days ? ` · ضمانت ${x.warranty_days} روز` : ""}</div>
          </button>
        ))}
      </div>
      <button className="btn-primary w-full text-lg" disabled={!v?.in_stock || !v.price}
        onClick={() => { if (!v?.price) return; add({ sku: v.sku, qty: 1, title: `${product.title} | ${v.name}`, price: v.price }); haptic("success"); router.push("/cart"); }}>
        افزودن به سبد · {toman(v?.price)}
      </button>
    </div>
  );
}
