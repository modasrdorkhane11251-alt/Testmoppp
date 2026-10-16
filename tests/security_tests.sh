#!/usr/bin/env bash
# Security Tests for SlowMegaBot
# استفاده: bash tests/security_tests.sh

BASE_URL="${BASE_URL:-http://localhost:3000}"
ADMIN_KEY="${ADMIN_API_KEY:-}"

if [ -z "$ADMIN_KEY" ]; then
  echo "❌ ADMIN_API_KEY تنظیم نشده. مثال:"
  echo "   ADMIN_API_KEY=your_key bash tests/security_tests.sh"
  exit 1
fi

PASS=0
FAIL=0

check() {
  local desc="$1"
  local expected="$2"
  local actual="$3"

  if [ "$expected" = "$actual" ]; then
    echo "  ✅ $desc (expected: $expected)"
    PASS=$((PASS + 1))
  else
    echo "  ❌ $desc (expected: $expected, got: $actual)"
    FAIL=$((FAIL + 1))
  fi
}

echo ""
echo "==========================================="
echo "🔒 SlowMegaBot Security Test Suite"
echo "==========================================="
echo "Base URL: $BASE_URL"
echo ""

# ---- Test 1: Admin endpoints without key (should be 401) ----
echo "📋 Test 1: Admin endpoints reject unauthenticated"
ENDPOINTS=(
  "/api/bot/token/status"
  "/api/bot/users"
  "/api/bot/state"
  "/api/bot/database/stats"
  "/api/database/stats"
  "/api/database/backup"
  "/api/n8n/config"
  "/api/n8n/attempts"
  "/api/installer/diagnostics"
  "/api/installer/configs"
  "/api/system/info"
  "/api/system/modules"
  "/api/system/logs"
  "/api/bale/status"
  "/api/rubika/status"
)

for ep in "${ENDPOINTS[@]}"; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$ep")
  check "GET $ep without key" "401" "$STATUS"
done

echo ""

# ---- Test 2: Admin endpoints with key (should be 200) ----
echo "📋 Test 2: Admin endpoints accept valid key"
for ep in "${ENDPOINTS[@]}"; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "X-Admin-Key: $ADMIN_KEY" "$BASE_URL$ep")
  if [ "$STATUS" = "200" ]; then
    echo "  ✅ GET $ep with key"
    PASS=$((PASS + 1))
  else
    echo "  ⚠️ GET $ep with key returned $STATUS (may be missing data)"
  fi
done

echo ""

# ---- Test 3: POST /api/bot/token/connect without key ----
echo "📋 Test 3: Sensitive POST endpoints reject unauthenticated"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST   -H "Content-Type: application/json"   -d '{"token":"fake"}'   "$BASE_URL/api/bot/token/connect")
check "POST /api/bot/token/connect without key" "401" "$STATUS"

echo ""

# ---- Test 4: Rate limit on verify-token ----
echo "📋 Test 4: verify-token rate limit (should hit 429 after 5)"
for i in 1 2 3 4 5 6; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST     -H "Content-Type: application/json"     -H "X-Admin-Key: $ADMIN_KEY"     -d '{"token":"123456789:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"}'     "$BASE_URL/api/installer/verify-token")
  if [ "$i" -le 5 ]; then
    # در 5 تلاش اول نباید 429 بده
    if [ "$STATUS" = "429" ]; then
      echo "  ⚠️ Rate limit hit early (attempt $i)"
    fi
  else
    check "Attempt 6 should be rate-limited" "429" "$STATUS"
  fi
done

echo ""

# ---- Test 5: SSRF protection ----
echo "📋 Test 5: SSRF protection on proxy"
SSRF_URLS=(
  "http://localhost/admin"
  "http://127.0.0.1/admin"
  "http://192.168.1.1/admin"
  "http://169.254.169.254/latest/meta-data"
  "http://10.0.0.1/admin"
)

for url in "${SSRF_URLS[@]}"; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}"     "$BASE_URL/api/proxy/fetch?url=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$url'))")")
  check "SSRF blocked: $url" "403" "$STATUS"
done

echo ""

# ---- Test 6: Telegram webhook without secret ----
echo "📋 Test 6: Telegram webhook rejects invalid secret"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST   -H "Content-Type: application/json"   -H "X-Telegram-Bot-Api-Secret-Token: wrong_secret"   -d '{"update_id":1}'   "$BASE_URL/api/telegram/webhook")
check "Telegram webhook with wrong secret" "403" "$STATUS"

echo ""
echo "==========================================="
echo "📊 Results: $PASS passed, $FAIL failed"
echo "==========================================="
echo ""

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
exit 0
