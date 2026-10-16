import { handleTelegramIncomingMessage, botStorage } from '../src/services/botEngine';
import { getDetailedArzyRates, calculateArzyConversion, parseNaturalArzyQuery } from '../src/services/realApis';
import { authenticateWebAppUser, buildWebAppButton } from '../src/services/webAppAuth';
import { validateMediaUrl, handleUniversalDownloader } from '../src/services/botEngine';
import { fetchUniversalDownload, stripTrackingParams, normalizeShortenedUrl } from '../src/services/realApis';

async function runTestSuite() {
  console.log('========================================');
  console.log('RUNNING SLOWMEGABOT DOWNLOADER & TRACKING STRIPPING TEST SUITE');
  console.log('========================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  [PASS] ${testName}`);
    } else {
      console.error(`  [FAIL] ${testName}`);
    }
  }

  // Test 1: Direct MP4 link
  console.log('1. Testing Direct MP4 Link Validation & Extraction:');
  const directUrl = 'https://www.w3schools.com/html/mov_bbb.mp4';
  const v1 = validateMediaUrl(directUrl);
  assert(v1.isValid === true, 'Direct MP4 URL should be valid');

  const res1 = fetchUniversalDownload(directUrl);
  assert(Boolean(res1 && res1.url), 'Direct MP4 download item should return valid item');
  assert(res1.contentType === 'video', 'Content type should be video');

  // Test 2: Public Instagram link with tracking tags (?igsh=...&utm_source=...) & Preset resolution
  console.log('\n2. Testing Public Instagram Link & Tracking Tag Stripping:');
  const instaUrlWithTracking = 'https://www.instagram.com/reel/C4x891ABcd/?igsh=eXNrbDlzZWcybXV1&utm_source=ig_web_button_share_sheet&utm_medium=referral';
  const strippedInsta = stripTrackingParams(instaUrlWithTracking);
  assert(!strippedInsta.includes('igsh=') && !strippedInsta.includes('utm_source='), 'Tracking parameters (igsh, utm_source) must be stripped');

  const v2 = validateMediaUrl(instaUrlWithTracking);
  assert(v2.isValid === true, 'Instagram Reel URL with tracking tags should be valid');
  const res2 = fetchUniversalDownload(strippedInsta);
  assert(Boolean(res2 && res2.url), 'Instagram download item should return valid item');
  assert(res2.platform === 'instagram', 'Platform should be detected as instagram');

  // Test un-preset unresolvable URL returns error message instead of fake video
  const unresolvableUrl = 'https://www.instagram.com/reel/UnresolvablePostId123/';
  const resUnresolvable = fetchUniversalDownload(unresolvableUrl);
  assert(resUnresolvable.formats.length === 0 && resUnresolvable.description.includes('امکان استخراج'), 'Unresolvable URL must return error description and zero formats instead of fake video');

  // Test 3: Shortened URLs (youtu.be, vm.tiktok.com)
  console.log('\n3. Testing Shortened URL Resolution & Platform Detection:');
  const shortYt = 'https://youtu.be/dQw4w9WgXcQ?si=abcdef123456';
  const normalizedYt = normalizeShortenedUrl(shortYt);
  assert(normalizedYt.includes('youtube.com/watch?v=dQw4w9WgXcQ'), 'youtu.be link should normalize to youtube.com/watch?v=...');
  const strippedYt = stripTrackingParams(shortYt);
  assert(!strippedYt.includes('si='), 'YouTube tracking parameters must be stripped');

  const shortTiktok = 'https://vm.tiktok.com/ZMkY7dF3g/';
  const normalizedTiktok = normalizeShortenedUrl(shortTiktok);
  assert(normalizedTiktok.includes('tiktok.com'), 'vm.tiktok.com link should normalize to tiktok.com');

  // Test 4: Invalid and garbage input
  console.log('\n4. Testing Invalid URL Handling:');
  const invalidUrl = 'https://random-unknown-site.org/nonexistent/file';
  const v4 = validateMediaUrl(invalidUrl);
  assert(v4.isValid === false, 'Invalid string should not be a valid media URL');

  // Test 5: Expired / 404 / Private simulated
  console.log('\n5. Testing Expired / 404 / Private URL Handling:');
  const privateUrl = 'https://instagram.com/p/private_post_demo';
  const v5 = validateMediaUrl(privateUrl);
  assert(v5.isValid === false, 'Expired or private URL should be flagged as invalid');
  assert(Boolean(v5.reason && (v5.reason.includes('private') || v5.reason.includes('expired'))), 'Reason should indicate expiry or privacy');

  // Test 6: Message without URL (should prompt for URL)
  console.log('\n6. Testing Message Without URL:');
  const dummyUser = { id: 123456, first_name: 'کاربر تست' };
  const respNoUrl = handleUniversalDownloader(123456, dummyUser, 'سلام ربات خوبی؟');
  assert(respNoUrl.length > 0, 'Should return prompt for URL');
  assert(respNoUrl[0].text.includes('ارسال کنید'), 'Prompt should ask for URL');

  // Test 7: Message with multiple URLs & tracking parameters
  console.log('\n7. Testing Message With Multiple URLs & Tracking Params:');
  const multiUrlMsg = 'این لینک اینستاست https://www.instagram.com/reel/C4x891ABcd/?igsh=123 و اینم یوتیوب https://youtu.be/dQw4w9WgXcQ?si=456 دانلود کن';
  const respMulti = handleUniversalDownloader(123456, dummyUser, multiUrlMsg);
  assert(respMulti.length > 0 && (respMulti[0].text.includes('کیفیت') || respMulti[0].text.includes('امکان استخراج')), 'Should successfully process message with multiple URLs');

  // Test 8: WebApp Auth & Buttons
  console.log('\n8. Testing WebApp HMAC Auth & Button Generation:');
  const authTg = authenticateWebAppUser('telegram', 'user=%7B%22id%22%3A123%2C%22first_name%22%3A%22Guest%22%7D');
  assert(authTg.ok === true, 'Telegram guest auth should succeed');
  const authBale = authenticateWebAppUser('bale', 'user=%7B%22id%22%3A456%2C%22first_name%22%3A%22BaleUser%22%7D');
  assert(authBale.ok === true, 'Bale guest auth should succeed');
  const authRubika = authenticateWebAppUser('rubika', 'user=%7B%22id%22%3A789%2C%22first_name%22%3A%22RubikaUser%22%7D');
  assert(authRubika.ok === true, 'Rubika guest auth should succeed');
  const tgBtn = buildWebAppButton('telegram', '🎮 ورود به مافیا', 'https://example.com/mafia-webapp');
  assert(Boolean(tgBtn && (tgBtn as any).web_app), 'Telegram button should include web_app object');
  const rubikaBtn = buildWebAppButton('rubika', '🎮 ورود به مافیا', 'https://example.com/mafia-webapp');
  assert(Boolean(rubikaBtn && (rubikaBtn as any).url), 'Rubika button should include direct url');

  // Test 9: Live Currency & Arzy Calculator Tests (Inspired by modasr-arz)
  console.log('\n9. Testing Live Currency & Arzy Natural Calculator:');
  const detailedRates = await getDetailedArzyRates();
  assert(Array.isArray(detailedRates) && detailedRates.length >= 10, 'Detailed rates live array loaded successfully (items: ' + detailedRates.length + ')');

  const usd = detailedRates.find((r) => r.key === 'usd');
  const gold18 = detailedRates.find((r) => r.key === 'gold_18k');
  const emami = detailedRates.find((r) => r.key === 'coin_emami');
  assert(Boolean(usd && usd.priceToman > 100000 && gold18 && gold18.priceToman > 5000000 && emami && emami.priceToman > 50000000),
    'Realistic price bounds verified: USD (' + usd?.priceToman + '), Gold 18K (' + gold18?.priceToman + '), Emami (' + emami?.priceToman + ')');

  // Test Natural Query parsing
  const q1 = parseNaturalArzyQuery('قیمت ۱۰۰ دلار چنده؟');
  const q2 = parseNaturalArzyQuery('نرخ تتر امروز');
  const q3 = parseNaturalArzyQuery('سکه امامی');
  assert(q1.isArzyQuery && q1.cleanKey === 'usd' && q1.amount === 100, 'Natural query for 100 USD parsed correctly');
  assert(q2.isArzyQuery && q2.cleanKey === 'usdt' && q2.amount === 1, 'Natural query for USDT parsed correctly');
  assert(q3.isArzyQuery && q3.cleanKey === 'coin_emami' && q3.amount === 1, 'Natural query for Seke Emami parsed correctly');

  // Test Calculator
  const conv = calculateArzyConversion(100, 'usd', detailedRates);
  assert(conv.tomanTotal > 10000000 && Math.round(conv.usdTotal) >= 99, 'Interactive currency calculator computed accurately');

  // Test Bot Engine Incoming Message with natural arzy text
  const freshArzyUser = { id: 888777, first_name: 'کاربر تست استعلام' };
  botStorage.userStates.delete(888777);
  const botRespDollar = await handleTelegramIncomingMessage(freshArzyUser, 888777, 'قیمت دلار');
  assert(botRespDollar.length > 0 && botRespDollar[0].text.includes('استعلام لحظه‌ای'), 'Bot engine successfully answers Persian query (قیمت دلار)');

  const botResp100Usd = await handleTelegramIncomingMessage(freshArzyUser, 888777, '۱۰۰ دلار');
  assert(botResp100Usd.length > 0 && botResp100Usd[0].text.includes('محاسبه هوشمند'), 'Bot engine successfully answers calculation query (۱۰۰ دلار)');

  console.log('========================================');
  console.log(`TEST RESULTS: ${passedTests}/${totalTests} TESTS PASSED.`);
  console.log('========================================');

  if (passedTests !== totalTests) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTestSuite().catch((err) => {
  console.error('Test suite uncaught error:', err);
  process.exit(1);
});
