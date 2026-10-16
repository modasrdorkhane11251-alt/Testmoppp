import type { Metadata, Viewport } from "next";
import Script from "next/script";
import Header from "@/components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "MODASR HUB | فروشگاه هوشمند محصولات دیجیتال", template: "%s | MODASR HUB" },
  description: "اشتراک هوش مصنوعی، تلگرام پرمیوم، گیفت‌کارت و محصولات دیجیتال با تحویل فوری و پشتیبانی هوشمند.",
  applicationName: "MODASR HUB",
};
export const viewport: Viewport = { themeColor: "#050816", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
        <Header />
        <main className="mx-auto max-w-7xl px-5 pb-24 pt-8">{children}</main>
      </body>
    </html>
  );
}
