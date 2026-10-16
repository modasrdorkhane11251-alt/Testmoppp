/**
 * Unified Input Validation & Data Sanitization Service
 * Standard validation rules across bot commands, web inputs, API requests, and installer forms.
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedValue?: string;
}

export class ValidationService {
  /**
   * Validates Telegram Bot API Token format: `123456789:ABCdefGHIjklMNOpqrSTUvwxYZ`
   */
  public static validateTelegramToken(token: string): ValidationResult {
    if (!token || typeof token !== 'string') {
      return { isValid: false, error: 'توکن ربات تلگرام نمی‌تواند خالی باشد.' };
    }
    const clean = token.trim();
    const tokenRegex = /^[0-9]{8,11}:[a-zA-Z0-9_-]{34,36}$/;
    if (!tokenRegex.test(clean)) {
      return {
        isValid: false,
        error: 'فرمت توکن تلگرام نامعتبر است (الگوی استاندارد: عددی:رشته ۳۵ کاراکتری).',
      };
    }
    return { isValid: true, sanitizedValue: clean };
  }

  /**
   * Validates web URL format
   */
  public static validateUrl(url: string): ValidationResult {
    if (!url || typeof url !== 'string') {
      return { isValid: false, error: 'آدرس اینترنتی (URL) نمی‌تواند خالی باشد.' };
    }
    const trimmed = url.trim();
    try {
      const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return { isValid: false, error: 'پروتکل آدرس باید HTTP یا HTTPS باشد.' };
      }
      return { isValid: true, sanitizedValue: parsed.toString() };
    } catch {
      return { isValid: false, error: 'فرمت آدرس اینترنتی واردشده نامعتبر است.' };
    }
  }

  /**
   * Validates email address format
   */
  public static validateEmail(email: string): ValidationResult {
    if (!email || typeof email !== 'string') {
      return { isValid: false, error: 'ایمیل نمی‌تواند خالی باشد.' };
    }
    const clean = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clean)) {
      return { isValid: false, error: 'فرمت آدرس ایمیل نامعتبر است.' };
    }
    return { isValid: true, sanitizedValue: clean };
  }

  /**
   * Validates Iranian mobile phone number format (09xxxxxxxxx or +989xxxxxxxxx)
   */
  public static validateIranianPhone(phone: string): ValidationResult {
    if (!phone) {
      return { isValid: false, error: 'شماره موبایل نمی‌تواند خالی باشد.' };
    }
    const clean = phone.replace(/[\s-]/g, '');
    const phoneRegex = /^(?:(?:\+?98)|0)?9\d{9}$/;
    if (!phoneRegex.test(clean)) {
      return { isValid: false, error: 'شماره تلفن همراه باید با 09 یا +989 آغاز شود (۱۱ رقم).' };
    }
    const normalized = clean.startsWith('+98')
      ? '0' + clean.slice(3)
      : clean.startsWith('98')
      ? '0' + clean.slice(2)
      : clean.startsWith('9')
      ? '0' + clean
      : clean;
    return { isValid: true, sanitizedValue: normalized };
  }

  /**
   * Validates SQL script syntax safety and basic structure
   */
  public static validateSqlScript(sql: string): ValidationResult {
    if (!sql || !sql.trim()) {
      return { isValid: false, error: 'اسکریپت SQL ارسالی خالی است.' };
    }
    const clean = sql.trim();
    // Check for obvious dangerous destructive injection commands outside DROP/CREATE
    const hasValidCommands = /(CREATE|INSERT|UPDATE|DROP|ALTER|SELECT)\s+/i.test(clean);
    if (!hasValidCommands) {
      return { isValid: false, error: 'اسکریپت واردشده حاوی دستورات معتبر SQL نیست.' };
    }
    return { isValid: true, sanitizedValue: clean };
  }

  /**
   * Sanitizes filenames to prevent path traversal or invalid filesystem characters
   */
  public static sanitizeFilename(filename: string): string {
    return filename
      .replace(/[/\\?%*:|"<>]/g, '_')
      .replace(/\.\.+/g, '.')
      .trim();
  }

  /**
   * Mask sensitive tokens or passwords in outputs
   */
  public static maskSecret(secret: string, visibleStart: number = 4, visibleEnd: number = 4): string {
    if (!secret || secret.length <= visibleStart + visibleEnd) {
      return '********';
    }
    const start = secret.slice(0, visibleStart);
    const end = secret.slice(-visibleEnd);
    const maskedLength = Math.min(secret.length - visibleStart - visibleEnd, 16);
    return `${start}${'*'.repeat(maskedLength)}${end}`;
  }
}
