"use client";
import Link from "next/link";
import { ShoppingBag, User } from "lucide-react";
import { useCart } from "@/lib/cart";
import { inTelegram } from "@/lib/telegram";

export default function Header() {
  const count = useCart((s) => s.lines.reduce((a, l) => a + l.qty, 0));
  if (inTelegram()) return null; // Telegram provides its own chrome
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-ink/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-5 py-4">
        <Link href="/" className="font-en text-xl font-bold tracking-tight">
          MODASR<span className="text-cyan">·</span>HUB
        </Link>
        <nav className="hidden gap-6 text-mist md:flex">
          <Link href="/shop" className="hover:text-white">فروشگاه</Link>
          <Link href="/support" className="hover:text-white">پشتیبانی</Link>
          <Link href="/affiliate" className="hover:text-white">همکاری در فروش</Link>
          <Link href="/blog" className="hover:text-white">مجله</Link>
        </nav>
        <div className="ms-auto flex items-center gap-3">
          <Link href="/dashboard" className="btn-ghost !px-3 !py-2" aria-label="حساب کاربری"><User size={18} /></Link>
          <Link href="/cart" className="btn-ghost relative !px-3 !py-2" aria-label="سبد خرید">
            <ShoppingBag size={18} />
            {count > 0 && <span className="num absolute -top-1 -left-1 grid h-5 w-5 place-items-center rounded-full bg-cyan text-xs text-ink">{count}</span>}
          </Link>
        </div>
      </div>
    </header>
  );
}
