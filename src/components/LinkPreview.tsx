import React, { useState, useEffect } from 'react';
import { ExternalLink, Globe, Sparkles, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { detectDownloadPlatform } from '../services/realApis';

export interface LinkMetadata {
  url: string;
  title: string;
  description: string;
  image?: string;
  siteName: string;
  domain: string;
  favicon?: string;
  contentType?: string;
}

interface LinkPreviewProps {
  url: string;
  className?: string;
  compact?: boolean;
}

export const LinkPreview: React.FC<LinkPreviewProps> = ({ url, className = '', compact = false }) => {
  const [metadata, setMetadata] = useState<LinkMetadata | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [imageError, setImageError] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    setImageError(false);

    if (!url) {
      setLoading(false);
      return;
    }

    const platform = detectDownloadPlatform(url);

    // Extract domain cleanly
    let domain = '';
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      domain = parsed.hostname.replace(/^www\./, '');
    } catch {
      domain = url.split('/')[0] || 'وب‌سایت';
    }

    // Default rich metadata generator based on platform & URL structure
    const generateSmartMetadata = (): LinkMetadata => {
      const lower = url.toLowerCase();
      const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

      if (platform === 'instagram') {
        const isReel = lower.includes('/reel/') || lower.includes('/reels/');
        const isStory = lower.includes('/stories/');
        const shortcodeMatch = url.match(/(?:reel|reels|p|stories)\/([a-zA-Z0-9_-]+)/i);
        const shortcode = shortcodeMatch ? shortcodeMatch[1] : '';
        return {
          url,
          title: isReel
            ? `ریلز اینستاگرام (Instagram Reel)${shortcode ? ` • شناسه: ${shortcode}` : ''}`
            : isStory
            ? `استوری اینستاگرام (Instagram Story)${shortcode ? ` • شناسه: ${shortcode}` : ''}`
            : `پست اینستاگرام (Instagram Post)${shortcode ? ` • شناسه: ${shortcode}` : ''}`,
          description: 'مشاهده و دانلود با کیفیت اورجینال 1080p بدون واترمارک به همراه صوت و کپشن کامل.',
          image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=700&auto=format&fit=crop&q=80',
          siteName: 'اینستاگرام (Instagram)',
          domain: 'instagram.com',
          favicon,
          contentType: isReel ? 'Reel' : 'Post',
        };
      }

      if (platform === 'youtube') {
        const isShorts = lower.includes('/shorts/');
        return {
          url,
          title: isShorts ? 'یوتیوب شورتس (YouTube Shorts)' : 'ویدیو یوتیوب (YouTube Video HD)',
          description: 'پخش و دانلود مستقیم کیفیت‌های 1080p ،720p و فایل صوتی MP3 با ترافیک بهینه‌شده.',
          image: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=700&auto=format&fit=crop&q=80',
          siteName: 'یوتیوب (YouTube)',
          domain: 'youtube.com',
          favicon,
          contentType: isShorts ? 'Shorts' : 'Video',
        };
      }

      if (platform === 'tiktok') {
        return {
          url,
          title: 'ویدیو تیک‌تاک ترند (TikTok Video HD)',
          description: 'دانلود بدون واترمرک با بالاترین رزولوشن و استخراج فایل صدای اصلی ویدیو.',
          image: 'https://images.unsplash.com/photo-1596526131083-e8c633c948d2?w=700&auto=format&fit=crop&q=80',
          siteName: 'تیک‌تاک (TikTok)',
          domain: 'tiktok.com',
          favicon,
          contentType: 'Video',
        };
      }

      if (platform === 'pinterest') {
        return {
          url,
          title: 'تصویر / ایده پینترست (Pinterest Pin)',
          description: 'کیفیت اصلی و والپیپر با وضوح بالا ۴K از سرورهای ابری پینترست.',
          image: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=700&auto=format&fit=crop&q=80',
          siteName: 'پینترست (Pinterest)',
          domain: 'pinterest.com',
          favicon,
          contentType: 'Pin',
        };
      }

      if (platform === 'spotify') {
        return {
          url,
          title: 'قطعه موسیقی اسپاتیفای (Spotify Track)',
          description: 'پخش آنلاین و دانلود موزیک با بیت‌ریت ۳۲۰kbps به همراه کاور و متادیتای رسمی ID3.',
          image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=700&auto=format&fit=crop&q=80',
          siteName: 'اسپاتیفای (Spotify)',
          domain: 'spotify.com',
          favicon,
          contentType: 'Music',
        };
      }

      if (platform === 'telegram') {
        return {
          url,
          title: 'پست یا کانال تلگرام (Telegram Post)',
          description: 'مشاهده محتوا، فایل‌ها و آمار بازدید (سین) پیام‌های عمومی کانال‌های تلگرام.',
          image: 'https://images.unsplash.com/photo-1614680376593-902f749f7ffc?w=700&auto=format&fit=crop&q=80',
          siteName: 'تلگرام (Telegram)',
          domain: 't.me',
          favicon,
          contentType: 'Post',
        };
      }

      if (platform === 'aparat') {
        return {
          url,
          title: 'ویدیو سرویس اشتراک ویدیو آپارات (Aparat)',
          description: 'پخش و دانلود با سرعت بالا در سرورهای داخلی و نیم‌بهای کشور.',
          image: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=700&auto=format&fit=crop&q=80',
          siteName: 'آپارات (Aparat)',
          domain: 'aparat.com',
          favicon,
          contentType: 'Video',
        };
      }

      // Generic website / direct media URL
      const isDirectMedia = /\.(mp4|mp3|m4a|mkv|jpg|png|webp|pdf)$/i.test(url);
      return {
        url,
        title: isDirectMedia ? `فایل مستقیم رسانه (${url.split('.').pop()?.toUpperCase()})` : `صفحه وب: ${domain}`,
        description: isDirectMedia
          ? `لینک دانلود مستقیم فایل از دامنه ${domain} آماده پردازش و ذخیره در آرشیو ربات.`
          : `صفحه مقصد در دامنه ${domain} شناسایی شد و آماده پردازش در سامانه می‌باشد.`,
        image: isDirectMedia
          ? 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=700&auto=format&fit=crop&q=80'
          : undefined,
        siteName: domain,
        domain,
        favicon,
        contentType: isDirectMedia ? 'Direct Media' : 'Web Page',
      };
    };

    // Try fetching live metadata from preview endpoint, fallback to smart metadata
    fetch(`/api/media/preview?url=${encodeURIComponent(url)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Preview fetch failed');
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          if (data && data.title && data.title !== 'Instagram' && data.title !== 'YouTube' && data.title !== 'TikTok') {
            setMetadata({
              url,
              title: data.title,
              description: data.description || 'پیش‌نمایش محتوای مقصد آماده شد.',
              image: data.image || generateSmartMetadata().image,
              siteName: data.siteName || domain,
              domain: data.domain || domain,
              favicon: data.favicon || `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
              contentType: data.contentType,
            });
          } else {
            setMetadata(generateSmartMetadata());
          }
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setMetadata(generateSmartMetadata());
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [url]);

  if (loading) {
    return (
      <div className={`mt-2 bg-[#121c27] border border-[#242f3d] rounded-xl p-3 animate-pulse space-y-2.5 ${className}`}>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-slate-700" />
          <div className="h-3 w-28 bg-slate-700 rounded" />
        </div>
        <div className="h-4 w-3/4 bg-slate-700 rounded" />
        <div className="h-24 w-full bg-slate-800 rounded-lg" />
      </div>
    );
  }

  if (!metadata) return null;

  return (
    <div
      className={`mt-2 text-right bg-[#101923] border border-[#242f3d] hover:border-cyan-500/50 transition-all rounded-xl overflow-hidden shadow-lg group ${className}`}
      dir="rtl"
    >
      {/* Top Header: Favicon + Domain name + Tag */}
      <div className="p-2.5 px-3 bg-[#14202d] border-b border-[#242f3d]/70 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 truncate">
          {metadata.favicon ? (
            <img
              src={metadata.favicon}
              alt=""
              className="w-4 h-4 rounded-xs shrink-0 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          )}
          <span className="text-xs font-bold text-slate-200 truncate">{metadata.siteName}</span>
          <span className="text-[10px] text-slate-400 font-mono hidden sm:inline truncate">
            ({metadata.domain})
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {metadata.contentType && (
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[9px] font-bold border border-cyan-500/30">
              {metadata.contentType}
            </span>
          )}
          <a
            href={metadata.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 rounded hover:bg-[#202d3b] text-slate-400 hover:text-cyan-300 transition-colors"
            title="باز کردن لینک اصلی در پنجره جدید"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Main Content: Title, Description, Image */}
      <div className={`${compact ? 'p-2.5' : 'p-3'} space-y-2`}>
        {/* Title */}
        <h4 className="font-bold text-xs sm:text-sm text-white group-hover:text-cyan-300 transition-colors line-clamp-1 leading-snug">
          {metadata.title}
        </h4>

        {/* Description */}
        <p className="text-[11px] text-slate-300/90 leading-relaxed line-clamp-2">
          {metadata.description}
        </p>

        {/* Thumbnail Preview Banner */}
        {metadata.image && !imageError && (
          <div className="relative rounded-lg overflow-hidden border border-[#242f3d] bg-black/40 mt-1 max-h-48 group-hover:border-cyan-500/30 transition-all">
            <img
              src={metadata.image}
              alt={metadata.title}
              className="w-full h-32 sm:h-36 object-cover hover:scale-105 transition-transform duration-500"
              onError={() => setImageError(true)}
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-2 right-2.5 left-2.5 flex items-center justify-between text-[10px] text-white/90">
              <span className="flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded-md backdrop-blur-xs font-mono">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>متادیتای پیش‌نمایش</span>
              </span>
              <span className="bg-[#0088cc] px-2 py-0.5 rounded-md font-bold text-[9px]">
                پیکربندی هوشمند
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Footer Action */}
      <div className="px-3 py-2 bg-[#0e1621] border-t border-[#242f3d]/60 flex items-center justify-between text-[11px]">
        <span className="text-slate-400 truncate max-w-[220px] font-mono text-[10px] text-left" dir="ltr">
          {metadata.url}
        </span>
        <a
          href={metadata.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 transition-colors shrink-0"
        >
          <span>مشاهده منبع</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};
