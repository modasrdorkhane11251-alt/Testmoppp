/**
 * Unified Bot Execution Logger & Telemetry Service
 * Tracks each step of the bot's execution:
 * 1. Detection: URL extraction, command parsing, platform & content-type detection
 * 2. API Request: Dispatched payload, external API calls, latency measurement, and timeout/retries
 * 3. Stream Extraction: Resolving direct media streams, formats (1080p, 720p, audio), and response assembly
 * 4. Validation: Header verification, MIME-type, text length, and Telegram-compatible entity sanitization
 */

import { BotLog } from '../types/telegram';

export type BotExecutionStep = 'Detection' | 'API Request' | 'Stream Extraction' | 'Validation';

export type LogLevel = 'info' | 'warn' | 'error' | 'traffic' | 'system' | 'webhook';

export interface ExecutionStepLog {
  id: string;
  step: BotExecutionStep;
  status: 'pending' | 'success' | 'failed' | 'retrying';
  timestamp: string;
  unixTime: number;
  durationMs?: number;
  content: string;
  details?: Record<string, any>;
  errorMessage?: string;
}

export interface SystemLogEntry {
  id: string;
  timestamp: string;
  unixTime: number;
  level: LogLevel;
  source: 'bot_engine' | 'server_api' | 'n8n_webhook' | 'database_manager' | 'auto_installer';
  message: string;
  data?: any;
}

class LoggerService {
  private logs: SystemLogEntry[] = [];
  private stepLogs: ExecutionStepLog[] = [];
  private maxCapacity: number = 300;

  constructor() {
    this.addLog('system', 'server_api', 'سامانه لاگینگ یکپارچه و عیب‌یابی چندمرحله‌ای SlowMegaBot آغاز به کار کرد.');
  }

  // ==========================================
  // 1. Core Bot Execution Step Loggers
  // ==========================================

  /**
   * Generates a structured BotLog object suitable for App.tsx botLogs state
   */
  public createStepLog(
    step: BotExecutionStep,
    content: string,
    type: 'incoming' | 'outgoing' | 'callback' | 'error' | 'system' = 'system',
    raw?: any
  ): BotLog {
    return {
      id: `step_${step.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString('fa-IR'),
      type,
      content: `[${step}] ${content}`,
      raw,
    };
  }

  /**
   * Step 1: Detection
   * Logs URL extraction, command parsing, and platform detection
   */
  public logDetection(
    input: string,
    details: {
      isUrl: boolean;
      platform?: string;
      contentType?: string;
      command?: string;
      cleanedUrl?: string;
    }
  ): BotLog {
    const isUrl = details.isUrl;
    let description = '';

    if (isUrl) {
      description = `تشخیص لینک ${details.platform || 'وب'} (${details.contentType || 'مدیا'}) | آدرس: ${details.cleanedUrl || input}`;
    } else if (details.command) {
      description = `تشخیص دستور ربات: ${details.command}`;
    } else {
      description = `تشخیص پیام متنی معمولی: "${input.slice(0, 40)}${input.length > 40 ? '...' : ''}"`;
    }

    const logEntry = this.createStepLog('Detection', description, 'incoming', {
      rawInput: input,
      ...details,
    });

    this.recordStep('Detection', 'success', description, details);
    return logEntry;
  }

  /**
   * Step 2: API Request
   * Logs dispatched API requests, upstream metadata queries, and latency
   */
  public logApiRequest(
    target: string,
    details: {
      endpoint: string;
      latencyMs: number;
      statusCode?: number;
      success: boolean;
      retries?: number;
      payload?: any;
      errorMessage?: string;
    }
  ): BotLog {
    const statusText = details.success ? '✓ موفق' : '✗ ناموفق';
    const desc = `درخواست به ${target} (${details.endpoint}) در ${details.latencyMs}ms [${statusText}]`;

    const logEntry = this.createStepLog(
      'API Request',
      desc,
      details.success ? 'system' : 'error',
      details
    );

    this.recordStep(
      'API Request',
      details.success ? 'success' : 'failed',
      desc,
      details,
      details.latencyMs,
      details.errorMessage
    );

    return logEntry;
  }

  /**
   * Step 3: Stream Extraction
   * Logs resolution of media streams, downloadable formats, and attachments
   */
  public logStreamExtraction(
    details: {
      hasMedia: boolean;
      contentType?: string;
      formatsCount?: number;
      mediaUrl?: string;
      audioExtracted?: boolean;
      previewThumbnail?: string;
    }
  ): BotLog {
    let desc = '';
    if (details.hasMedia) {
      desc = `استخراج موفق استریم رسانه (${details.contentType || 'video'}) | کیفیت‌ها: ${details.formatsCount || 1} مورد${details.audioExtracted ? ' + صوت MP3' : ''}`;
    } else {
      desc = 'استخراج محتوای متنی و دکمه‌های شیشه‌ای پاسخ بات (بدون فایل استریم مستقیم)';
    }

    const logEntry = this.createStepLog('Stream Extraction', desc, 'outgoing', details);
    this.recordStep('Stream Extraction', 'success', desc, details);
    return logEntry;
  }

  /**
   * Step 4: Validation
   * Logs Telegram entity validation, HTML/Markdown tag safety, and delivery packet verification
   */
  public logValidation(
    details: {
      isValid: boolean;
      messageCount: number;
      charLength: number;
      entitiesSanitized: boolean;
      error?: string;
    }
  ): BotLog {
    const desc = details.isValid
      ? `اعتبارسنجی پاسخ نهایی: ${details.messageCount} پیام، کاراکترها: ${details.charLength}، موجودیت‌های متنی امن (Sanitized) ✓`
      : `خطا در اعتبارسنجی پکت تحویل: ${details.error || 'داده‌های پاسخ ناقص است'}`;

    const logEntry = this.createStepLog(
      'Validation',
      desc,
      details.isValid ? 'system' : 'error',
      details
    );

    this.recordStep(
      'Validation',
      details.isValid ? 'success' : 'failed',
      desc,
      details,
      undefined,
      details.error
    );

    return logEntry;
  }

  private recordStep(
    step: BotExecutionStep,
    status: 'pending' | 'success' | 'failed' | 'retrying',
    content: string,
    details?: any,
    durationMs?: number,
    errorMessage?: string
  ) {
    const entry: ExecutionStepLog = {
      id: `steplog_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      step,
      status,
      timestamp: new Date().toLocaleTimeString('fa-IR'),
      unixTime: Date.now(),
      durationMs,
      content,
      details,
      errorMessage,
    };
    this.stepLogs.unshift(entry);
    if (this.stepLogs.length > this.maxCapacity) {
      this.stepLogs.pop();
    }
  }

  public getStepLogs(limit = 50): ExecutionStepLog[] {
    return this.stepLogs.slice(0, limit);
  }

  // ==========================================
  // 2. General System Loggers
  // ==========================================

  public addLog(
    level: LogLevel,
    source: SystemLogEntry['source'],
    message: string,
    data?: any
  ): SystemLogEntry {
    const entry: SystemLogEntry = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      timestamp: new Date().toLocaleTimeString('fa-IR'),
      unixTime: Date.now(),
      level,
      source,
      message,
      data,
    };
    this.logs.unshift(entry);
    if (this.logs.length > this.maxCapacity) {
      this.logs.pop();
    }
    return entry;
  }

  public getLogs(limit?: number, level?: LogLevel, source?: SystemLogEntry['source']): SystemLogEntry[] {
    let result = this.logs;
    if (level) {
      result = result.filter((l) => l.level === level);
    }
    if (source) {
      result = result.filter((l) => l.source === source);
    }
    if (limit && limit > 0) {
      result = result.slice(0, limit);
    }
    return result;
  }

  public clearLogs(): void {
    this.logs = [];
    this.stepLogs = [];
    this.addLog('system', 'server_api', 'حافظه لاگ‌ها پاکسازی شد.');
  }

  public exportLogsJson(): string {
    return JSON.stringify({ systemLogs: this.logs, executionStepLogs: this.stepLogs }, null, 2);
  }

  public getStats(): { total: number; errors: number; traffic: number; webhooks: number; stepsCount: number } {
    return {
      total: this.logs.length,
      errors: this.logs.filter((l) => l.level === 'error').length,
      traffic: this.logs.filter((l) => l.level === 'traffic').length,
      webhooks: this.logs.filter((l) => l.level === 'webhook').length,
      stepsCount: this.stepLogs.length,
    };
  }
}

export const logger = new LoggerService();
export const loggerService = logger;
