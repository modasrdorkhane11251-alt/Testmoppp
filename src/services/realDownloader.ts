export interface RealDownloadResult {
  ok: boolean;
  mediaUrl?: string;
  thumbnail?: string;
  title?: string;
  author?: string;
  error?: string;
}

export async function extractWithYtDlp(url: string): Promise<RealDownloadResult> {
  if (typeof window !== 'undefined') {
    return { ok: false, error: 'yt-dlp only runs on server-side' };
  }
  try {
    const cp = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(cp.exec);
    const { stdout } = await execAsync(`yt-dlp --dump-json "${url}"`, { timeout: 8000 });
    const info = JSON.parse(stdout);
    return {
      ok: true,
      mediaUrl: info.url || info.requested_downloads?.[0]?.url,
      thumbnail: info.thumbnail,
      title: info.title,
      author: info.uploader || info.channel,
    };
  } catch (err: any) {
    return { ok: false, error: err.message || 'yt-dlp not available or failed' };
  }
}

export async function extractInstagramViaOEmbed(url: string): Promise<RealDownloadResult> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`https://api.instagram.com/oembed/?url=${encodeURIComponent(url)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = (await res.json()) as any;
      return {
        ok: true,
        title: data.title || 'پست اینستاگرام',
        author: data.author_name ? `@${data.author_name}` : undefined,
        thumbnail: data.thumbnail_url,
        mediaUrl: data.thumbnail_url,
      };
    }
  } catch {}

  return await extractFromPublicInstagramService(url);
}

export async function extractFromPublicInstagramService(url: string): Promise<RealDownloadResult> {
  const shortcodeMatch = url.match(/\/(reel|p|tv)\/([A-Za-z0-9_-]+)/);
  if (!shortcodeMatch) {
    return { ok: false, error: 'شناسه پست یافت نشد' };
  }
  const shortcode = shortcodeMatch[2];

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch('https://snapinsta.app/action.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0',
      },
      body: `url=${encodeURIComponent(url)}`,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const text = await res.text();
      const data = JSON.parse(text);
      if (data.url && Array.isArray(data.url) && data.url[0]?.url) {
        return {
          ok: true,
          mediaUrl: data.url[0].url,
          thumbnail: data.thumb,
          title: 'پست اینستاگرام',
        };
      }
    }
  } catch {}

  const rapidApiKey = typeof process !== 'undefined' ? process.env.RAPIDAPI_KEY : undefined;
  if (rapidApiKey) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`https://instagram-scraper-api2.p.rapidapi.com/v1/post_info?code_or_id_or_url=${shortcode}`, {
        headers: {
          'X-RapidAPI-Key': rapidApiKey,
          'X-RapidAPI-Host': 'instagram-scraper-api2.p.rapidapi.com',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = (await res.json()) as any;
        if (data.data?.video_url) {
          return {
            ok: true,
            mediaUrl: data.data.video_url,
            thumbnail: data.data.thumbnail_url,
            title: data.data.caption?.slice(0, 100),
            author: data.data.owner?.username ? `@${data.data.owner.username}` : undefined,
          };
        }
      }
    } catch {}
  }

  return {
    ok: false,
    error: 'تمام سرویس‌های عمومی برای استخراج اینستاگرام ناموفق بودند',
  };
}

export async function extractMedia(url: string): Promise<RealDownloadResult> {
  const ytResult = await extractWithYtDlp(url);
  if (ytResult.ok) return ytResult;

  if (url.includes('instagram.com')) {
    const igResult = await extractInstagramViaOEmbed(url);
    if (igResult.ok) return igResult;
  }

  return {
    ok: false,
    error: 'امکان استخراج از این لینک وجود ندارد. علت: ' + (ytResult.error || 'سرویس‌ها در دسترس نیستند'),
  };
}
