import Link from "next/link";
import { Product, toman } from "@/lib/api";

export default function ProductCard({ p }: { p: Product }) {
  return (
    <Link href={`/p/${p.slug}`} className="glass group flex flex-col overflow-hidden transition hover:-translate-y-1 hover:border-cyan/40 hover:shadow-neon">
      <div className="aspect-[4/3] overflow-hidden bg-deep">
        {p.images[0] && <img src={p.images[0]} alt={p.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-bold leading-7">{p.title}</h3>
        {p.short && <p className="line-clamp-2 text-sm text-mist">{p.short}</p>}
        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="text-sm text-mist">از</span>
          <span className="num text-lg font-bold text-cyan">{toman(p.price_from)}</span>
        </div>
        {!p.in_stock && <span className="text-sm text-yellow-400">ناموجود</span>}
      </div>
    </Link>
  );
}
