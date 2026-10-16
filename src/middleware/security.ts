// src/middleware/security.ts
import { Request, Response, NextFunction } from 'express';

/**
 * بررسی دسترسی ادمین از طریق هدر X-Admin-Key یا کوئری admin_key
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const providedKey =
    (req.headers['x-admin-key'] as string | undefined) ||
    (req.query.admin_key as string | undefined) ||
    '';

  const expectedKey = process.env.ADMIN_API_KEY;

  if (!expectedKey) {
    console.error('[SECURITY] ADMIN_API_KEY در متغیرهای محیطی تنظیم نشده است.');
    res.status(500).json({ ok: false, error: 'پیکربندی سرور ناقص است' });
    return;
  }

  if (providedKey !== expectedKey) {
    console.warn(`[SECURITY] تلاش دسترسی غیرمجاز به ${req.method} ${req.path} از IP ${req.ip || req.socket.remoteAddress}`);
    res.status(401).json({ ok: false, error: 'دسترسی غیرمجاز' });
    return;
  }

  next();
}

/**
 * بررسی سکرت وب‌هوک تلگرام
 */
export function requireTelegramSecret(req: Request, res: Response, next: NextFunction): void {
  const provided = (req.headers['x-telegram-bot-api-secret-token'] as string | undefined) || '';
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!expected) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[SECURITY] TELEGRAM_WEBHOOK_SECRET تنظیم نشده — حالت توسعه');
      next();
      return;
    }
    res.status(500).json({ ok: false, error: 'Server misconfigured' });
    return;
  }

  if (provided !== expected) {
    console.warn(`[SECURITY] توکن نامعتبر در وب‌هوک تلگرام از IP ${req.ip}`);
    res.status(403).json({ ok: false, error: 'Forbidden' });
    return;
  }

  next();
}

/**
 * بررسی کلید n8n
 */
export function requireN8nSecret(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'] as string | undefined;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
  const provided = (req.headers['x-n8n-secret'] as string | undefined) || bearerToken || '';
  const expected = process.env.N8N_INTERNAL_SECRET;

  if (!expected) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[SECURITY] N8N_INTERNAL_SECRET تنظیم نشده — حالت توسعه');
      next();
      return;
    }
    res.status(500).json({ ok: false, error: 'Server misconfigured' });
    return;
  }

  if (provided !== expected) {
    console.warn(`[SECURITY] توکن نامعتبر n8n به ${req.path} از IP ${req.ip}`);
    res.status(403).json({ ok: false, error: 'Forbidden' });
    return;
  }

  next();
}

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

export interface RateLimitOptions {
  windowMs?: number;
  max?: number;
  keyGenerator?: (req: Request) => string;
  message?: string;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) rateLimitStore.delete(key);
  }
}, 60_000);

export function rateLimit(options: RateLimitOptions = {}) {
  const windowMs = options.windowMs ?? 60_000;
  const max = options.max ?? 60;
  const keyGenerator =
    options.keyGenerator ||
    ((req: Request) => (req.ip || req.socket.remoteAddress || 'unknown'));
  const message = options.message || 'تعداد درخواست‌ها بیش از حد مجاز است';

  return (req: Request, res: Response, next: NextFunction): void => {
    const clientKey = `${req.path}:${keyGenerator(req)}`;
    const now = Date.now();
    const record = rateLimitStore.get(clientKey);

    if (!record || now > record.resetTime) {
      rateLimitStore.set(clientKey, { count: 1, resetTime: now + windowMs });
      next();
      return;
    }

    if (record.count >= max) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      res.status(429).json({ ok: false, error: message, retryAfter });
      return;
    }

    record.count += 1;
    next();
  };
}

/**
 * 🔒 SSRF Guard — بلاک کردن IP های خصوصی و metadata endpoints
 * برای مسیرهای proxy/downloader استفاده می‌شود
 */
export function isSafeExternalUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();

    // Loopback
    if (['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]'].includes(host)) return false;
    // Cloud metadata
    if (['169.254.169.254', 'metadata.google.internal', 'metadata'].includes(host)) return false;
    // RFC 1918 private
    if (/^10\./.test(host)) return false;
    if (/^192\.168\./.test(host)) return false;
    if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)) return false;
    // Link-local
    if (/^169\.254\./.test(host)) return false;
    // IPv6 private
    if (host.startsWith('fe80:') || host.startsWith('fc') || host.startsWith('fd')) return false;

    return true;
  } catch {
    return false;
  }
}

/**
 * 🔒 Middleware مخصوص مسیرهای proxy/downloader برای SSRF protection
 */
export function ssrfGuard(req: Request, res: Response, next: NextFunction): void {
  const targetUrl = String(req.query.url || req.body?.url || '');
  if (!targetUrl) {
    res.status(400).json({ ok: false, error: 'URL الزامی است' });
    return;
  }

  if (!isSafeExternalUrl(targetUrl)) {
    console.warn(`[SECURITY] SSRF attempt blocked: ${targetUrl.slice(0, 80)} from ${req.ip}`);
    res.status(403).json({ ok: false, error: 'آدرس مقصد مجاز نیست (SSRF protection)' });
    return;
  }

  next();
}
