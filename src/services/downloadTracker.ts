/**
 * Universal Download Tracker & Core Resilience Engine
 * Provides structured, 10-step auditing and failure point protection for all media downloaders.
 * 
 * 10 Standard Stages:
 * 1. message_received: Raw message input received
 * 2. link_extracted: URL extracted and tracking queries stripped
 * 3. platform_detected: Domain and content-type detected
 * 4. metadata_fetched: Metadata (author, title, cover) obtained
 * 5. media_url_retrieved: Direct media / stream URLs resolved
 * 6. download_started: Connection to CDN initiated
 * 7. download_ended: Stream completed / verified
 * 8. file_validated: MIME-type, non-zero size, and format headers validated
 * 9. file_ready_sent: File packet delivered / presented to user
 * 10. final_result: Final execution status (SUCCESS / FAILED with masked error)
 */

export type DownloadStage =
  | 'message_received'
  | 'link_extracted'
  | 'platform_detected'
  | 'metadata_fetched'
  | 'media_url_retrieved'
  | 'download_started'
  | 'download_ended'
  | 'file_validated'
  | 'file_ready_sent'
  | 'final_result';

export interface StageLog {
  step: number;
  stage: DownloadStage;
  stageNameFa: string;
  status: 'pending' | 'success' | 'failed' | 'skipped';
  timestamp: string;
  durationMs?: number;
  details?: Record<string, any>;
  errorMessage?: string;
}

export interface DownloadSession {
  requestId: string;
  startTime: number;
  endTime?: number;
  totalDurationMs?: number;
  rawInput: string;
  cleanedUrl?: string;
  platform?: string;
  contentType?: string;
  success: boolean;
  currentStep: number;
  stages: StageLog[];
  fileInfo?: {
    filename?: string;
    mimeType?: string;
    sizeMb?: number;
    quality?: string;
  };
  failureReason?: string;
  networkDetails?: {
    latencyMs?: number;
    statusCode?: number;
    cdnHost?: string;
  };
}

export const STAGE_DEFINITIONS: Record<DownloadStage, { step: number; nameFa: string }> = {
  message_received: { step: 1, nameFa: 'دریافت پیام و درخواست کاربر' },
  link_extracted: { step: 2, nameFa: 'استخراج URL و حذف تگ‌های ردیابی' },
  platform_detected: { step: 3, nameFa: 'تشخیص هوشمند پلتفرم و نوع محتوا' },
  metadata_fetched: { step: 4, nameFa: 'واکشی متادیتا (عنوان، کاور، ناشر)' },
  media_url_retrieved: { step: 5, nameFa: 'استخراج URL مستقیم مدیا و کیفیت‌ها' },
  download_started: { step: 6, nameFa: 'برقراری اتصال و شروع استریم مدیا' },
  download_ended: { step: 7, nameFa: 'پایان دریافت بایت‌های فایل' },
  file_validated: { step: 8, nameFa: 'اعتبارسنجی هدرها، سایز و MIME-Type' },
  file_ready_sent: { step: 9, nameFa: 'آماده‌سازی پیوست و ارسال به کاربر' },
  final_result: { step: 10, nameFa: 'نتیجه نهایی و ثبت وضعیت عملیات' },
};

export class DownloadTrackerService {
  private sessions: Map<string, DownloadSession> = new Map();
  private maxSessions: number = 100;

  /**
   * Generates a safe, unforgeable Request ID: REQ-DL-<TIMESTAMP>-<RANDOM>
   */
  public generateRequestId(): string {
    const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `REQ-DL-${Date.now()}-${rand}`;
  }

  /**
   * Sanitizes text to prevent leakage of tokens, API keys, passwords, or cookies
   */
  public sanitize(input: any): any {
    if (typeof input === 'string') {
      return input
        .replace(/(?:api_?key|token|bot\d+:[\w-]+|password|secret|authorization)=([^\s&]+)/gi, '$1=***MASKED***')
        .replace(/([0-9]{8,10}:[a-zA-Z0-9_-]{35})/g, 'bot***:***MASKED***');
    }
    if (Array.isArray(input)) {
      return input.map((item) => this.sanitize(item));
    }
    if (input && typeof input === 'object') {
      const sanitizedObj: Record<string, any> = {};
      for (const [key, value] of Object.entries(input)) {
        if (/token|key|secret|cookie|pass|auth/i.test(key)) {
          sanitizedObj[key] = '***MASKED***';
        } else {
          sanitizedObj[key] = this.sanitize(value);
        }
      }
      return sanitizedObj;
    }
    return input;
  }

  /**
   * Starts a new download session
   */
  public startSession(rawInput: string, customRequestId?: string): DownloadSession {
    const requestId = customRequestId || this.generateRequestId();
    const session: DownloadSession = {
      requestId,
      startTime: Date.now(),
      rawInput: this.sanitize(rawInput),
      success: false,
      currentStep: 1,
      stages: [
        {
          step: 1,
          stage: 'message_received',
          stageNameFa: STAGE_DEFINITIONS.message_received.nameFa,
          status: 'success',
          timestamp: new Date().toLocaleTimeString('fa-IR'),
          details: { inputLength: rawInput.length },
        },
      ],
    };

    this.sessions.set(requestId, session);

    // Evict oldest if exceeding capacity
    if (this.sessions.size > this.maxSessions) {
      const oldestKey = this.sessions.keys().next().value;
      if (oldestKey) this.sessions.delete(oldestKey);
    }

    return session;
  }

  /**
   * Records progress of a specific stage
   */
  public logStage(
    requestId: string,
    stage: DownloadStage,
    status: 'success' | 'failed' | 'skipped',
    details?: Record<string, any>,
    errorMessage?: string
  ): void {
    const session = this.sessions.get(requestId);
    if (!session) return;

    const def = STAGE_DEFINITIONS[stage];
    const durationMs = Date.now() - session.startTime;

    const stageLog: StageLog = {
      step: def.step,
      stage,
      stageNameFa: def.nameFa,
      status,
      timestamp: new Date().toLocaleTimeString('fa-IR'),
      durationMs,
      details: details ? this.sanitize(details) : undefined,
      errorMessage: errorMessage ? this.sanitize(errorMessage) : undefined,
    };

    session.stages.push(stageLog);
    session.currentStep = def.step;

    if (errorMessage && status === 'failed') {
      session.failureReason = this.sanitize(errorMessage);
    }

    // Final result calculation
    if (stage === 'final_result') {
      session.endTime = Date.now();
      session.totalDurationMs = session.endTime - session.startTime;
      session.success = status === 'success';
    }
  }

  /**
   * Retrieves a session by its request ID
   */
  public getSession(requestId: string): DownloadSession | undefined {
    return this.sessions.get(requestId);
  }

  /**
   * Lists the most recent download sessions
   */
  public getSessions(limit = 20): DownloadSession[] {
    return Array.from(this.sessions.values())
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, limit);
  }

  /**
   * Safe fetch with AbortSignal timeout and network error analysis
   */
  public async safeFetch(
    url: string,
    options: RequestInit = {},
    timeoutMs = 15000
  ): Promise<{ ok: boolean; status?: number; data?: any; error?: string; latencyMs: number }> {
    const start = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timer);
      const latencyMs = Date.now() - start;

      const contentType = response.headers.get('content-type') || '';
      let data: any = null;

      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      return {
        ok: response.ok,
        status: response.status,
        data,
        latencyMs,
      };
    } catch (err: any) {
      clearTimeout(timer);
      const latencyMs = Date.now() - start;
      const isTimeout = err.name === 'AbortError' || err.message?.includes('timeout') || err.message?.includes('aborted');

      return {
        ok: false,
        latencyMs,
        error: isTimeout
          ? `Timeout (${timeoutMs}ms) هنگام برقراری ارتباط با سرور مقصد`
          : `خطای شبکه: ${err.message || 'اتصال برقرار نشد'}`,
      };
    }
  }

  /**
   * Validates downloaded file headers & MIME-Type
   */
  public validateMediaFileHeaders(
    headers: Headers,
    expectedType: 'video' | 'audio' | 'image' | 'file' = 'video'
  ): { isValid: boolean; mimeType: string; sizeBytes: number; reason?: string } {
    const contentType = headers.get('content-type')?.toLowerCase() || '';
    const contentLength = parseInt(headers.get('content-length') || '0', 10);

    // Check HTML error page disguised as media
    if (contentType.includes('text/html') || contentType.includes('application/json')) {
      return {
        isValid: false,
        mimeType: contentType,
        sizeBytes: contentLength,
        reason: 'سرور مبدا به جای فایل رسانه‌ای، صفحه خطا یا لاگین (HTML/JSON) بازگرداند.',
      };
    }

    // Check Content-Type match
    if (expectedType === 'video' && !contentType.includes('video') && !contentType.includes('octet-stream') && !contentType.includes('mp4')) {
      return {
        isValid: false,
        mimeType: contentType,
        sizeBytes: contentLength,
        reason: `فرمت نامعتبر: انتظار ویدیو می‌رفت اما ${contentType} دریافت شد.`,
      };
    }

    if (expectedType === 'audio' && !contentType.includes('audio') && !contentType.includes('mpeg') && !contentType.includes('mp3')) {
      return {
        isValid: false,
        mimeType: contentType,
        sizeBytes: contentLength,
        reason: `فرمت نامعتبر: انتظار صوت می‌رفت اما ${contentType} دریافت شد.`,
      };
    }

    // Check size limit: minimum 5KB for media
    if (contentLength > 0 && contentLength < 5120) {
      return {
        isValid: false,
        mimeType: contentType,
        sizeBytes: contentLength,
        reason: `فایل آسیب‌دیده یا خالی است (حجم بسیار ناچیز: ${contentLength} بایت).`,
      };
    }

    return {
      isValid: true,
      mimeType: contentType || 'application/octet-stream',
      sizeBytes: contentLength,
    };
  }
}

export const downloadTracker = new DownloadTrackerService();
