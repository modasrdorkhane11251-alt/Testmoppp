# ساختار پروژه / Project Structure

این مخزن شامل دو پروژه اصلی است:

## ۱. Modasr Hubot (SlowMegaBot) — ریشه مخزن
پلتفرم بات چندسکویی (تلگرام، بله، روبیکا و وب‌اپ) با نصب‌کننده تعاملی دوزبانه.

| مسیر | توضیح |
|---|---|
| `src/` | کامپوننت‌ها و سرویس‌های React + TypeScript |
| `server.ts` | سرور Express + Vite |
| `install.sh` | نصب‌کننده تعاملی خودکار (۱۰ مرحله‌ای) |
| `locales/` | فایل‌های زبان (fa/en) |
| `tests/` | تست‌های نصب‌کننده، دانلودر و امنیت |
| `superbot_python/` | هسته پایتون بات (آداپتورهای تلگرام/بله/روبیکا) |
| `superbot_php/` | سرویس‌های PHP نسخه‌های قدیمی‌تر |
| `mafia-webapp.html` | وب‌اپ بازی مافیا |

## ۲. modasr-os/
پروژه فروشگاه/سیستم‌عامل مدرس — بک‌اند FastAPI، بات پایتون، فرانت Next.js، زیرساخت Docker.

| مسیر | توضیح |
|---|---|
| `modasr-os/backend/` | API بک‌اند (FastAPI + Celery) |
| `modasr-os/bot/` | ربات تلگرام |
| `modasr-os/web/` | فرانت Next.js |
| `modasr-os/infra/` | nginx و prometheus |
| `modasr-os/n8n/` | workflow اتوماسیون |
| `modasr-os/scripts/` | اسکریپت‌های کمکی |
| `modasr-os/docs/` | مستندات فنی |

## نکات نگهداری
- فایل‌های تکراری (زیپ‌های تو در تو و پوشه `.aistudio`) حذف شده‌اند.
- برای نصب پروژه اصلی: `bash install.sh`
- برای اجرای تست‌ها: `bash tests/installer/test_installer.sh`

## انتشار در گیت‌هاب / Publishing to GitHub
```bash
git init                              # (if not already a repo)
git add -A && git commit -m "Initial release: Modasr Hubot + modasr-os"
git remote add origin https://github.com/<USER>/<REPO>.git
git branch -M main
git push -u origin main
```
