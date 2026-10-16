import crypto from 'crypto';

export interface WebAppUser {
  id: number | string;
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
  platform: 'telegram' | 'bale' | 'rubika';
  authDate: number;
}

export interface WebAppAuthResult {
  ok: boolean;
  user?: WebAppUser;
  error?: string;
}

export interface BotTokenConfig {
  telegram?: string;
  bale?: string;
  rubika?: string;
}

/**
 * Validates HMAC-SHA256 signature for Telegram or Bale WebApp initData
 */
function verifyTelegramOrBaleInitData(
  initDataStr: string,
  botToken: string
): { isValid: boolean; parsedData: Record<string, string> } {
  const parsedData: Record<string, string> = {};
  if (!initDataStr) return { isValid: false, parsedData };

  try {
    const params = new URLSearchParams(initDataStr);
    let hash = '';

    const dataCheckArr: string[] = [];
    params.forEach((value, key) => {
      if (key === 'hash') {
        hash = value;
      } else {
        dataCheckArr.push(key + '=' + value);
      }
      parsedData[key] = value;
    });

    dataCheckArr.sort();
    const dataCheckString = dataCheckArr.join('\n');

    if (!botToken || !hash) {
      // Demo/local fallback when token or hash is missing
      return { isValid: true, parsedData };
    }

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    const isValid = computedHash.toLowerCase() === hash.toLowerCase();
    return { isValid, parsedData };
  } catch (err) {
    return { isValid: false, parsedData };
  }
}

/**
 * Validates HMAC-SHA256 signature for Rubika WebApp initData
 */
function verifyRubikaInitData(
  initDataStr: string,
  botToken: string
): { isValid: boolean; parsedData: Record<string, string> } {
  const parsedData: Record<string, string> = {};
  if (!initDataStr) return { isValid: false, parsedData };

  try {
    const params = new URLSearchParams(initDataStr);
    let hash = '';

    const dataCheckArr: string[] = [];
    params.forEach((value, key) => {
      if (key === 'hash' || key === 'sign') {
        hash = value;
      } else {
        dataCheckArr.push(key + '=' + value);
      }
      parsedData[key] = value;
    });

    dataCheckArr.sort();
    const dataCheckString = dataCheckArr.join('\n');

    if (!botToken || !hash) {
      return { isValid: true, parsedData };
    }

    const secretKey = crypto.createHmac('sha256', 'RubikaWebAppData').update(botToken).digest();
    const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    const isValid = computedHash.toLowerCase() === hash.toLowerCase();
    return { isValid, parsedData };
  } catch (err) {
    return { isValid: false, parsedData };
  }
}

/**
 * Authenticates WebApp initData for Telegram, Bale, or Rubika with 24h auth_date check
 */
export function authenticateWebAppUser(
  platform: 'telegram' | 'bale' | 'rubika',
  initDataStr: string,
  botTokens: BotTokenConfig = {}
): WebAppAuthResult {
  // If guest / demo mode without initData
  if (!initDataStr || !initDataStr.trim()) {
    return {
      ok: true,
      user: {
        id: 12345678,
        firstName: 'کاربر مهمان وب‌اپ',
        username: 'guest_webapp_user',
        platform,
        authDate: Math.floor(Date.now() / 1000),
      },
    };
  }

  const token = botTokens[platform] || '';
  const verification =
    platform === 'rubika'
      ? verifyRubikaInitData(initDataStr, token)
      : verifyTelegramOrBaleInitData(initDataStr, token);

  const isDev = process.env.NODE_ENV !== 'production';

  if (!verification.isValid) {
    if (platform === 'rubika' && isDev) {
      console.warn('⚠️ [Rubika WebApp Warning]: Invalid signature ignored in development environment.');
    } else if (token) {
      return {
        ok: false,
        error: 'امضای HMAC داده‌های WebApp معتبر نیست یا دستکاری شده است.',
      };
    }
  }

  const parsedData = verification.parsedData;

  // 24-hour expiration check
  const authDate = parsedData.auth_date ? parseInt(parsedData.auth_date, 10) : Math.floor(Date.now() / 1000);
  const now = Math.floor(Date.now() / 1000);
  if (parsedData.auth_date && now - authDate > 86400) {
    return {
      ok: false,
      error: 'داده‌های احراز هویت WebApp منقضی شده است (بیشتر از ۲۴ ساعت). لطفاً مجدداً وارد شوید.',
    };
  }

  let userObj: WebAppUser | undefined = undefined;

  if (parsedData.user) {
    try {
      const u = JSON.parse(parsedData.user);
      userObj = {
        id: u.id || u.user_id || 12345678,
        firstName: u.first_name || u.firstName || 'کاربر وب‌اپ',
        lastName: u.last_name || u.lastName,
        username: u.username,
        languageCode: u.language_code || 'fa',
        platform,
        authDate,
      };
    } catch {
      // Fallback if parsing user JSON fails
    }
  }

  if (!userObj) {
    userObj = {
      id: parsedData.user_id || 12345678,
      firstName: parsedData.first_name || 'کاربر وب‌اپ',
      username: parsedData.username || `wa_${platform}_user`,
      platform,
      authDate,
    };
  }

  return {
    ok: true,
    user: userObj,
  };
}

/**
 * Builds an inline keyboard WebApp button formatted for the target platform
 */
export function buildWebAppButton(
  platform: 'telegram' | 'bale' | 'rubika',
  appUrl: string,
  buttonText: string = '🎮 ورود به بازی مافیا (Mini App)'
) {
  const webAppUrl = `${appUrl}/mafia-webapp`;
  if (platform === 'telegram' || platform === 'bale') {
    return { text: buttonText, web_app: { url: webAppUrl } };
  }
  return { text: buttonText, url: webAppUrl };
}
