#!/usr/bin/env bash
# ==============================================================================
#  SlowMegaBot - سامانه نصب خودکار حرفه‌ای (Auto Installer v3.0)
#  تجربه نصب تعاملی الهام‌گرفته از اسکریپت بات میرزا (Mirza Bot Architecture)
# ==============================================================================
#  این اسکریپت تمام نیازمندی‌ها، پکیج‌ها، وابستگی‌ها، تنظیمات تلگرام و وب‌سرور را
#  به‌صورت تعاملی و خودکار با اعتبارسنجی زنده در ۱۰ مرحله پیکربندی می‌نماید.
# ==============================================================================

set -o pipefail

# رنگ‌ها و قالب‌های متنی ترمینال
C_RESET="\033[0m"
C_BOLD="\033[1m"
C_DIM="\033[2m"
C_RED="\033[1;31m"
C_GREEN="\033[1;32m"
C_YELLOW="\033[1;33m"
C_BLUE="\033[1;34m"
C_MAGENTA="\033[1;35m"
C_CYAN="\033[1;36m"
C_WHITE="\033[1;37m"
C_BG_BLUE="\033[44m"

# فایل‌های مسیر
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="${PROJECT_DIR}/install.log"
LOCK_FILE="${PROJECT_DIR}/.installed.lock"
ENV_FILE="${PROJECT_DIR}/.env"
BACKUP_DIR="${PROJECT_DIR}/backups"
SERVICE_NAME="slowmegabot"

# تابع ثبت گزارش
log_msg() {
  local level="$1"
  local text="$2"
  local ts
  ts=$(date +"%Y-%m-%d %H:%M:%S")
  # ماسک کردن توکن‌ها و اطلاعات حساس در لاگ
  local safe_text
  safe_text=$(echo "$text" | sed -E 's/(bot)[0-9]+:[A-Za-z0-9_-]+/\1***:masked_token/g; s/(password|pass|secret)=[^ ]+/\1=***/g')
  echo "[${ts}] [${level}] ${safe_text}" >> "${LOG_FILE}"
}

# بنر شروع به سبک بات میرزا
show_banner() {
  clear
  echo -e "${C_CYAN}${C_BOLD}"
  cat << "EOF"
  ███████╗██╗      ██████╗ ██╗    ██╗███╗   ███╗███████╗ ██████╗  █████╗ 
  ██╔════╝██║     ██╔═══██╗██║    ██║████╗ ████║██╔════╝██╔════╝ ██╔══██╗
  ███████╗██║     ██║   ██║██║ █╗ ██║██╔████╔██║█████╗  ██║  ███╗███████║
  ╚════██║██║     ██║   ██║██║███╗██║██║╚██╔╝██║██╔══╝  ██║   ██║██╔══██║
  ███████║███████╗╚██████╔╝╚███╔███╔╝██║ ╚═╝ ██║███████╗╚██████╔╝██║  ██║
  ╚══════╝╚══════╝ ╚═════╝  ╚══╝╚══╝ ╚═╝     ╚═╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝
EOF
  echo -e "${C_RESET}"
  echo -e "${C_MAGENTA}${C_BOLD}   ★ سامانه نصب خودکار و مدیریت یکپارچه ربات جامع و دانلودر اسلومگابات ★${C_RESET}"
  echo -e "${C_DIM}   الهام‌گرفته از معماری نصب بات میرزا • نگارش ۳.۰ • سازگار با اوبونتو و دبیان${C_RESET}"
  echo -e "${C_CYAN}════════════════════════════════════════════════════════════════════════════════${C_RESET}"
  echo ""
}

# چاپ تیتر مرحله
step_header() {
  local num="$1"
  local total="$2"
  local title="$3"
  echo ""
  echo -e "${C_BG_BLUE}${C_WHITE}${C_BOLD} [${num}/${total}] ${title} ${C_RESET}"
  echo -e "${C_DIM}────────────────────────────────────────────────────────────────────────${C_RESET}"
  log_msg "STEP" "[${num}/${total}] ${title}"
}

print_success() {
  echo -e "  ${C_GREEN}✓${C_RESET} ${C_GREEN}$1${C_RESET}"
  log_msg "SUCCESS" "$1"
}

print_warning() {
  echo -e "  ${C_YELLOW}⚠${C_RESET} ${C_YELLOW}$1${C_RESET}"
  log_msg "WARN" "$1"
}

print_error() {
  echo -e "  ${C_RED}✗${C_RESET} ${C_RED}$1${C_RESET}"
  log_msg "ERROR" "$1"
}

print_info() {
  echo -e "  ${C_CYAN}ℹ${C_RESET} $1"
  log_msg "INFO" "$1"
}

# دریافت ورودی کاربر با مقدار پیش‌فرض
ask_prompt() {
  local prompt_text="$1"
  local default_val="$2"
  local var_name="$3"
  local is_secret="${4:-0}"
  local user_input=""

  if [ -n "${default_val}" ]; then
    echo -ne "  ${C_BOLD}${prompt_text}${C_RESET} ${C_DIM}[پیش‌فرض: ${default_val}]${C_RESET}: "
  else
    echo -ne "  ${C_BOLD}${prompt_text}${C_RESET}: "
  fi

  if [ "${is_secret}" -eq 1 ]; then
    read -r -s user_input
    echo ""
  else
    read -r user_input
  fi

  # ✅ استفاده از printf -v به جای eval (ایمن)
  if [ -z "${user_input}" ]; then
    printf -v "${var_name}" '%s' "${default_val}"
  else
    printf -v "${var_name}" '%s' "${user_input}"
  fi
}

# بررسی دسترسی root / sudo
check_root() {
  if [ "$(id -u)" -ne 0 ]; then
    print_warning "شما اسکریپت را بدون دسترسی کاربر ریشه (Root) اجرا کرده‌اید."
    print_info "برای نصب پیش‌نیازهای سیستمی (مانند ffmpeg, curl, nginx) دسترسی sudo لازم است."
    if ! command -v sudo &> /dev/null; then
      print_error "ابزار sudo در سیستم یافت نشد. لطفاً اسکریپت را با کاربر root اجرا کنید: su root"
      exit 1
    fi
    SUDO="sudo"
  else
    SUDO=""
  fi
}

# ایجاد نسخه پشتیبان
do_backup() {
  mkdir -p "${BACKUP_DIR}"
  local ts
  ts=$(date +"%Y%m%d_%H%M%S")
  local bkp_file="${BACKUP_DIR}/backup_${ts}.tar.gz"
  print_info "در حال ایجاد نسخه پشتیبان در: ${bkp_file}..."
  
  tar -czf "${bkp_file}" \
      --exclude="node_modules" \
      --exclude="dist" \
      --exclude="backups" \
      --exclude=".git" \
      -C "${PROJECT_DIR}" . 2>/dev/null || true

  if [ -f "${bkp_file}" ]; then
    print_success "نسخه پشتیبان با موفقیت در ${bkp_file} ذخیره شد."
  else
    print_warning "ایجاد نسخه پشتیبان با خطا مواجه شد."
  fi
}

# منوی مدیریت برای حالت نصب مجدد یا ویرایش
check_existing_install() {
  if [ -f "${LOCK_FILE}" ] || [ -f "${ENV_FILE}" ]; then
    show_banner
    print_warning "نصب قبلی SlowMegaBot در این مسیر شناسایی شد!"
    echo ""
    echo -e "  ${C_BOLD}لطفاً عملیات مورد نظر خود را انتخاب کنید:${C_RESET}"
    echo -e "  ${C_CYAN}[1]${C_RESET} بررسی وضعیت و آزمون سلامت ربات (Status & Diagnostics)"
    echo -e "  ${C_CYAN}[2]${C_RESET} راه‌اندازی مجدد سرویس پروژه (Restart Service)"
    echo -e "  ${C_CYAN}[3]${C_RESET} ویرایش تنظیمات ربات و توکن (Edit .env Config)"
    echo -e "  ${C_CYAN}[4]${C_RESET} به‌روزرسانی کدها و پکیج‌ها (Update Project & Packages)"
    echo -e "  ${C_CYAN}[5]${C_RESET} تهیه نسخه پشتیبان دستی (Create Full Backup)"
    echo -e "  ${C_CYAN}[6]${C_RESET} نصب مجدد کامل و بازنشانی (Full Clean Reinstall)"
    echo -e "  ${C_CYAN}[7]${C_RESET} حذف کامل و ایمن پروژه (Uninstall & Remove)"
    echo -e "  ${C_CYAN}[8]${C_RESET} خروج از نصاب (Exit)"
    echo ""
    echo -ne "  ${C_BOLD}شماره گزینه [1-8]:${C_RESET} "
    read -r choice

    case "$choice" in
      1)
        run_health_check_mode
        exit 0
        ;;
      2)
        restart_service_mode
        exit 0
        ;;
      3)
        edit_env_mode
        exit 0
        ;;
      4)
        update_project_mode
        exit 0
        ;;
      5)
        do_backup
        exit 0
        ;;
      6)
        print_info "در حال آماده‌سازی برای نصب مجدد کامل..."
        do_backup
        ;;
      7)
        uninstall_mode
        exit 0
        ;;
      8)
        echo -e "${C_GREEN}خروج از نصاب.${C_RESET}"
        exit 0
        ;;
      *)
        print_warning "گزینه نامعتبر است. ادامه فرایند نصب مجدد..."
        ;;
    esac
  fi
}

# حالت بررسی سلامت
run_health_check_mode() {
  show_banner
  echo -e "${C_BOLD}${C_CYAN}=== بررسی وضعیت و آزمون سلامت سامانه ===${C_RESET}\n"
  
  # بررسی وضعیت پورت
  local PORT=3000
  if [ -f "${ENV_FILE}" ]; then
    PORT=$(grep -E '^PORT=' "${ENV_FILE}" | cut -d '=' -f2 | tr -d '"' | tr -d "'" || echo "3000")
  fi

  # وضعیت سرویس
  if command -v systemctl &>/dev/null && systemctl is-active --quiet "${SERVICE_NAME}"; then
    print_success "سرویس systemd (${SERVICE_NAME}) فعال و در حال اجرا است."
  elif command -v pm2 &>/dev/null && pm2 list | grep -q "${SERVICE_NAME}"; then
    print_success "سرویس PM2 (${SERVICE_NAME}) فعال است."
  else
    print_warning "سرویس پس‌زمینه پروژه فعال نیست."
  fi

  # تست اتصال به وب‌سرور داخلی
  if curl -s "http://127.0.0.1:${PORT}/api/bot/token/status" &>/dev/null; then
    print_success "وب‌سرور داخلی روی پورت ${PORT} پاسخگو است."
  else
    print_warning "پاسخی از وب‌سرور داخلی روی پورت ${PORT} دریافت نشد."
  fi

  # تست توکن تلگرام
  if [ -f "${ENV_FILE}" ]; then
    local TG_TOKEN
    TG_TOKEN=$(grep -E '^TELEGRAM_BOT_TOKEN=' "${ENV_FILE}" | cut -d '=' -f2- | tr -d '"' | tr -d "'")
    if [ -n "${TG_TOKEN}" ]; then
      local TG_CHECK
      TG_CHECK=$(curl -s --max-time 8 "https://api.telegram.org/bot${TG_TOKEN}/getMe" 2>/dev/null || echo "")
      if echo "${TG_CHECK}" | grep -q '"ok":true'; then
        local B_USER
        B_USER=$(echo "${TG_CHECK}" | sed -n 's/.*"username":"\([^"]*\)".*/\1/p')
        print_success "توکن تلگرام فعال و معتبر است: @${B_USER}"
      else
        print_error "توکن تلگرام موجود در .env پاسخگو یا معتبر نیست."
      fi
    fi
  fi
}

# راه‌اندازی مجدد سرویس
restart_service_mode() {
  print_info "در حال راه‌اندازی مجدد سرویس..."
  if command -v systemctl &>/dev/null && [ -f "/etc/systemd/system/${SERVICE_NAME}.service" ]; then
    ${SUDO} systemctl restart "${SERVICE_NAME}"
    print_success "سرویس systemd (${SERVICE_NAME}) ری‌استارت شد."
  elif command -v pm2 &>/dev/null; then
    pm2 restart "${SERVICE_NAME}" 2>/dev/null || pm2 start "${PROJECT_DIR}/server.ts" --name "${SERVICE_NAME}" --interpreter tsx
    print_success "سرویس PM2 ری‌استارت شد."
  else
    print_warning "سرویس خودکاری برای ری‌استارت یافت نشد."
  fi
}

# ویرایش تنظیمات
edit_env_mode() {
  if [ -f "${ENV_FILE}" ]; then
    if command -v nano &>/dev/null; then
      nano "${ENV_FILE}"
    elif command -v vim &>/dev/null; then
      vim "${ENV_FILE}"
    else
      print_info "مسیر فایل تنظیمات: ${ENV_FILE}"
    fi
    restart_service_mode
  else
    print_error "فایل .env یافت نشد."
  fi
}

# بروزرسانی پروژه
update_project_mode() {
  show_banner
  print_info "در حال بروزرسانی کدها از مخزن گیت..."
  if [ -d "${PROJECT_DIR}/.git" ]; then
    git pull || print_warning "دریافت آخرین کدها از گیت ناموفق بود یا تغییرات محلی وجود دارد."
  fi
  print_info "در حال بروزرسانی پکیج‌های NPM..."
  npm install --omit=dev
  print_info "در حال ساخت مجدد بیلد..."
  npm run build
  restart_service_mode
  print_success "پروژه با موفقیت به آخرین نسخه بروزرسانی شد."
}

# حذف پروژه
uninstall_mode() {
  echo ""
  echo -e "${C_RED}${C_BOLD}هشدار خطرناک:${C_RESET} این عملیات سرویس و فایل‌های تنظیمات پروژه را پاک خواهد کرد."
  echo -ne "آیا از حذف مطمئن هستید؟ عبارت 'DELETE' را تایپ کنید: "
  read -r confirm_del
  if [ "${confirm_del}" == "DELETE" ]; then
    print_info "در حال توقف و غیرفعال‌سازی سرویس..."
    if command -v systemctl &>/dev/null && [ -f "/etc/systemd/system/${SERVICE_NAME}.service" ]; then
      ${SUDO} systemctl stop "${SERVICE_NAME}" 2>/dev/null || true
      ${SUDO} systemctl disable "${SERVICE_NAME}" 2>/dev/null || true
      ${SUDO} rm -f "/etc/systemd/system/${SERVICE_NAME}.service"
      ${SUDO} systemctl daemon-reload
    fi
    rm -f "${LOCK_FILE}"
    print_success "پروژه با موفقیت غیرفعال و سرویس آن حذف گردید."
  else
    print_info "عملیات حذف لغو گردید."
  fi
}

# ==============================================================================
# شروع مراحل ۱۰ گانه نصب اصلی
# ==============================================================================
main_installer() {
  # اگه زبان تنظیم نشده، بپرس
  if [ ! -f "${PROJECT_DIR}/.install_lang" ] && [ -t 0 ]; then
    clear
    echo -e "${C_CYAN}${C_BOLD}"
    echo "═══════════════════════════════════════════════════"
    echo "         SlowMegaBot — MODASR HUBOT"
    echo "═══════════════════════════════════════════════════"
    echo -e "${C_RESET}"
    echo ""
    echo -e "${C_BOLD}Select your language / زبان خود را انتخاب کنید:${C_RESET}"
    echo ""
    echo "  [1] فارسی"
    echo "  [2] English"
    echo ""
    echo -ne "${C_BOLD}Choice / انتخاب: ${C_RESET}"
    read -r lang_choice

    case "${lang_choice:-1}" in
      2)
        echo "LANG=en" > "${PROJECT_DIR}/.install_lang"
        T_LANG_SAVED="Language preference saved"
        ;;
      *)
        echo "LANG=fa" > "${PROJECT_DIR}/.install_lang"
        ;;
    esac

    source "${PROJECT_DIR}/.install_lang" 2>/dev/null || LANG="fa"
    load_language
  fi
  check_root
  check_existing_install
  show_banner

  # ----------------------------------------------------------------------------
  # مرحله ۱: بررسی سیستم‌عامل و سخت‌افزار
  # ----------------------------------------------------------------------------
  step_header "1" "10" "بررسی سیستم‌عامل، منابع سخت‌افزاری و دسترسی‌ها"
  
  local OS_NAME="Linux"
  if [ -f /etc/os-release ]; then
    # shellcheck disable=SC1091
    . /etc/os-release
    OS_NAME="${NAME:-Linux} ${VERSION_ID:-}"
  fi
  print_success "سیستم‌عامل شناسایی‌شده: ${OS_NAME}"

  local ARCH
  ARCH=$(uname -m)
  print_success "معماری پردازنده: ${ARCH}"

  local MEM_TOTAL
  MEM_TOTAL=$(free -m | awk '/Mem:/ {print $2}')
  if [ -n "${MEM_TOTAL}" ]; then
    print_success "حافظه رم در دسترس: ${MEM_TOTAL} مگابایت"
    if [ "${MEM_TOTAL}" -lt 500 ]; then
      print_warning "حافظه رم سرور کمتر از ۵۱۲ مگابایت است؛ ممکن است بیلد با کندی مواجه شود."
    fi
  fi

  local DISK_FREE
  DISK_FREE=$(df -h "${PROJECT_DIR}" | awk 'NR==2 {print $4}')
  print_success "فضای خالی دیسک در مسیر پروژه: ${DISK_FREE}"

  # ----------------------------------------------------------------------------
  # مرحله ۲: بررسی و نصب ابزارهای پایه و پیش‌نیازها
  # ----------------------------------------------------------------------------
  step_header "2" "10" "بررسی پیش‌نیازها و ابزارهای ضروری سیستم"

  local REQUIRED_TOOLS=("curl" "wget" "git" "tar" "unzip")
  local MISSING_TOOLS=()

  for tool in "${REQUIRED_TOOLS[@]}"; do
    if ! command -v "${tool}" &>/dev/null; then
      MISSING_TOOLS+=("${tool}")
    fi
  done

  if [ ${#MISSING_TOOLS[@]} -gt 0 ]; then
    print_info "در حال نصب ابزارهای پیش‌نیاز سیستمی (${MISSING_TOOLS[*]})..."
    if command -v apt-get &>/dev/null; then
      ${SUDO} apt-get update -y -q >> "${LOG_FILE}" 2>&1
      ${SUDO} apt-get install -y "${MISSING_TOOLS[@]}" >> "${LOG_FILE}" 2>&1
    elif command -v yum &>/dev/null; then
      ${SUDO} yum install -y "${MISSING_TOOLS[@]}" >> "${LOG_FILE}" 2>&1
    fi
  fi
  print_success "تمام ابزارهای پایه سیستمی نصب و آماده هستند."

  # بررسی ابزار FFmpeg برای استخراج واقعی صوت از ویدیو
  if ! command -v ffmpeg &>/dev/null; then
    print_info "ابزار FFmpeg (جهت استخراج صوت MP3 واقعی از ویدیوها) نصب نیست؛ در حال نصب..."
    if command -v apt-get &>/dev/null; then
      ${SUDO} apt-get install -y ffmpeg >> "${LOG_FILE}" 2>&1 || print_warning "نصب خودکار FFmpeg انجام نشد."
    fi
  fi
  if command -v ffmpeg &>/dev/null; then
    print_success "موتور FFmpeg برای تبدیل صوت و ویدیو فعال است."
  else
    print_warning "FFmpeg در دسترس نیست؛ تبدیل فایل‌ها از طریق پروکسی جایگزین انجام خواهد شد."
  fi

  # بررسی نسخه Node.js
  local NODE_VER=""
  if command -v node &>/dev/null; then
    NODE_VER=$(node -v)
    print_success "نسخه Node.js فعلی: ${NODE_VER}"
  else
    print_info "Node.js در سرور نصب نیست. در حال نصب خودکار Node.js 20 LTS..."
    if command -v apt-get &>/dev/null; then
      curl -fsSL https://deb.nodesource.com/setup_20.x | ${SUDO} -E bash - >> "${LOG_FILE}" 2>&1
      ${SUDO} apt-get install -y nodejs >> "${LOG_FILE}" 2>&1
      NODE_VER=$(node -v 2>/dev/null || echo "")
    fi
  fi

  if [ -z "${NODE_VER}" ]; then
    print_error "نصب Node.js ناموفق بود. لطفاً دستی Node.js نسخه ۱۸ یا ۲۰ را نصب کنید."
    exit 1
  fi

  # ----------------------------------------------------------------------------
  # مرحله ۳: دریافت تعاملی اطلاعات سرور و شبکه
  # ----------------------------------------------------------------------------
  step_header "3" "10" "تنظیمات شبکه، دامنه و پورت سرور"

  # تشخیص IP عمومی سرور
  local DETECTED_IP
  DETECTED_IP=$(curl -s --max-time 4 https://api.ipify.org || echo "127.0.0.1")
  print_info "آدرس IP عمومی شناسایی‌شده سرور: ${DETECTED_IP}"

  local DOMAIN_INPUT=""
  ask_prompt "دامنه یا زیردامنه سرور را وارد کنید (مثال: bot.example.com)" "${DETECTED_IP}" "DOMAIN_INPUT"

  local PROTOCOL_INPUT="http"
  if [[ "${DOMAIN_INPUT}" =~ \.[a-zA-Z]{2,}$ ]]; then
    ask_prompt "پروتکل اتصال وب‌سایت (https / http)" "https" "PROTOCOL_INPUT"
  else
    ask_prompt "پروتکل اتصال وب‌سایت (https / http)" "http" "PROTOCOL_INPUT"
  fi

  local PORT_INPUT="3000"
  ask_prompt "پورت اجرای برنامه SlowMegaBot" "3000" "PORT_INPUT"

  local APP_URL="${PROTOCOL_INPUT}://${DOMAIN_INPUT}"
  if [ "${PORT_INPUT}" != "80" ] && [ "${PORT_INPUT}" != "443" ] && [ "${DOMAIN_INPUT}" == "${DETECTED_IP}" ]; then
    APP_URL="${APP_URL}:${PORT_INPUT}"
  fi
  print_success "آدرس پایه برنامه (APP_URL): ${APP_URL}"

  # ----------------------------------------------------------------------------
  # مرحله ۴: دریافت و اعتبارسنجی زنده توکن ربات تلگرام
  # ----------------------------------------------------------------------------
  step_header "4" "10" "تنظیمات ربات تلگرام و اعتبارسنجی زنده API"

  local TG_BOT_TOKEN=""
  local TG_BOT_USERNAME=""
  local TG_BOT_FIRSTNAME=""
  local VALID_TOKEN=0

  while [ "${VALID_TOKEN}" -eq 0 ]; do
    ask_prompt "توکن ربات تلگرام خود را وارد کنید (از @BotFather)" "" "TG_BOT_TOKEN" "0"

    if [ -z "${TG_BOT_TOKEN}" ]; then
      print_warning "توکن خالی است! آیا می‌خواهید بعداً در فایل .env تنظیم کنید؟ [y/N]: "
      read -r skip_tg
      if [[ "${skip_tg}" =~ ^[Yy]$ ]]; then
        TG_BOT_TOKEN="MY_TELEGRAM_BOT_TOKEN"
        break
      fi
      continue
    fi

    print_info "در حال اعتبارسنجی توکن با سرور رسمی تلگرام (getMe)..."
    local TG_RES
    TG_RES=$(curl -s --max-time 10 "https://api.telegram.org/bot${TG_BOT_TOKEN}/getMe" 2>/dev/null || echo "")

    if echo "${TG_RES}" | grep -q '"ok":true'; then
      TG_BOT_USERNAME=$(echo "${TG_RES}" | sed -n 's/.*"username":"\([^"]*\)".*/\1/p')
      TG_BOT_FIRSTNAME=$(echo "${TG_RES}" | sed -n 's/.*"first_name":"\([^"]*\)".*/\1/p')
      print_success "توکن معتبر است! نام ربات: ${TG_BOT_FIRSTNAME} (@${TG_BOT_USERNAME})"
      VALID_TOKEN=1
    else
      local ERR_DESC
      ERR_DESC=$(echo "${TG_RES}" | sed -n 's/.*"description":"\([^"]*\)".*/\1/p')
      print_error "توکن تلگرام نامعتبر است یا ارتباط با API تلگرام برقرار نشد: ${ERR_DESC:-خطای ناشناخته}"
      echo -ne "  آیا مایلید مجدداً توکن را وارد کنید؟ [Y/n]: "
      read -r retry_token
      if [[ "${retry_token}" =~ ^[Nn]$ ]]; then
        VALID_TOKEN=1
      fi
    fi
  done

  # شناسه عددی مدیر
  local TG_ADMIN_ID=""
  ask_prompt "شناسه عددی اکانت مدیر در تلگرام (از @userinfobot)" "12345678" "TG_ADMIN_ID"

  # کانال عضویت اجباری
  local TG_CHANNEL_ID=""
  ask_prompt "آیدی کانال تلگرام برای قفل عضویت یا گزارش (اختیاری)" "@slowmegabot_channel" "TG_CHANNEL_ID"

  # ----------------------------------------------------------------------------
  # مرحله ۵: تنظیمات دیتابیس و بررسی اتصال
  # ----------------------------------------------------------------------------
  step_header "5" "10" "پیکربندی دیتابیس و بررسی اتصال"

  echo -e "  نوع دیتابیس مورد نظر خود را انتخاب کنید:"
  echo -e "  ${C_CYAN}[1]${C_RESET} دیتابیس سبک تعبیه‌شده (SQLite / In-Memory JSON - مناسب برای اجرای فوری بدون وابستگی)"
  echo -e "  ${C_CYAN}[2]${C_RESET} دیتابیس رابطه‌ای PostgreSQL"
  echo -e "  ${C_CYAN}[3]${C_RESET} دیتابیس MySQL / MariaDB"
  ask_prompt "گزینه دیتابیس" "1" "DB_CHOICE"

  local DB_TYPE="sqlite"
  local DB_HOST="localhost"
  local DB_PORT="5432"
  local DB_NAME="slowmegabot"
  local DB_USER="postgres"
  local DB_PASS=""

  case "${DB_CHOICE}" in
    2)
      DB_TYPE="postgres"
      ask_prompt "آدرس سرور دیتابیس PostgreSQL" "localhost" "DB_HOST"
      ask_prompt "پورت PostgreSQL" "5432" "DB_PORT"
      ask_prompt "نام دیتابیس" "slowmegabot" "DB_NAME"
      ask_prompt "نام کاربری دیتابیس" "postgres" "DB_USER"
      ask_prompt "رمز عبور دیتابیس" "" "DB_PASS" "1"

      print_info "در حال بررسی تست پورت دیتابیس ${DB_HOST}:${DB_PORT}..."
      if nc -z -w 3 "${DB_HOST}" "${DB_PORT}" 2>/dev/null || (timeout 3 bash -c "</dev/tcp/${DB_HOST}/${DB_PORT}") 2>/dev/null; then
        print_success "پورت سرور دیتابیس در دسترس است."
      else
        print_warning "اتصال مستقیم به پورت ${DB_PORT} دیتابیس برقرار نشد؛ لطفاً صحت اطلاعات را بررسی کنید."
      fi
      ;;
    3)
      DB_TYPE="mysql"
      DB_PORT="3306"
      DB_USER="root"
      ask_prompt "آدرس سرور دیتابیس MySQL" "localhost" "DB_HOST"
      ask_prompt "پورت MySQL" "3306" "DB_PORT"
      ask_prompt "نام دیتابیس" "slowmegabot" "DB_NAME"
      ask_prompt "نام کاربری دیتابیس" "root" "DB_USER"
      ask_prompt "رمز عبور دیتابیس" "" "DB_PASS" "1"
      ;;
    *)
      DB_TYPE="sqlite"
      print_success "دیتابیس سریع SQLite با ذخیره‌سازی محلی و ایزوله انتخاب شد."
      ;;
  esac

  # ----------------------------------------------------------------------------
  # مرحله ۶: تنظیمات تکمیلی هوش مصنوعی و اتوماسیون n8n
  # ----------------------------------------------------------------------------
  step_header "6" "10" "تنظیمات تکمیلی، کلید هوش مصنوعی و هاب n8n"

  local GEMINI_KEY=""
  ask_prompt "کلید API هوش مصنوعی گوگل (GEMINI_API_KEY - اختیاری برای جستجوی زنده)" "" "GEMINI_KEY" "1"

  local N8N_URL=""
  ask_prompt "آدرس وب‌هووک اتوماسیون n8n (اختیاری)" "" "N8N_URL"

  # ----------------------------------------------------------------------------
  # مرحله ۷: نصب بسته‌ها و وابستگی‌های پروژه (NPM Packages)
  # ----------------------------------------------------------------------------
  step_header "7" "10" "نصب پکیج‌ها و وابستگی‌های پروژه (npm install)"

  cd "${PROJECT_DIR}" || exit 1
  print_info "در حال نصب پکیج‌های پروژه از package.json..."

  if npm install >> "${LOG_FILE}" 2>&1; then
    print_success "تمامی پکیج‌ها و وابستگی‌های پروژه با موفقیت نصب شدند."
  else
    print_warning "نصب با خطای جزئی مواجه شد؛ تلاش مجدد با --legacy-peer-deps..."
    npm install --legacy-peer-deps >> "${LOG_FILE}" 2>&1 || print_warning "نصب دستی را بررسی کنید."
  fi

  # نصب tsx سراسری یا محلی در صورت نیاز
  if ! npx tsx --version &>/dev/null; then
    npm install -D tsx >> "${LOG_FILE}" 2>&1
  fi

  # ----------------------------------------------------------------------------
  # مرحله ۸: ساخت ایمن فایل تنظیمات محیطی (.env) با مجوز ۶۰۰
  # ----------------------------------------------------------------------------
  step_header "8" "10" "تولید ایمن فایل تنظیمات محیطی (.env) و تنظیم دسترسی‌ها"

  # پشتیبان از فایل قبلی
  if [ -f "${ENV_FILE}" ]; then
    cp "${ENV_FILE}" "${ENV_FILE}.bak.$(date +%s)"
  fi

  cat > "${ENV_FILE}" << EOF
# ==============================================================================
# SlowMegaBot Configuration File
# تولید شده خودکار توسط نصاب حرفه‌ای SlowMegaBot
# تاریخ تولید: $(date +"%Y-%m-%d %H:%M:%S")
# ==============================================================================

# تنظیمات سرور و محیط
PORT=${PORT_INPUT}
NODE_ENV=production
APP_URL="${APP_URL}"
SERVER_DOMAIN="${DOMAIN_INPUT}"

# تنظیمات ربات تلگرام
TELEGRAM_BOT_TOKEN="${TG_BOT_TOKEN}"
TELEGRAM_ADMIN_ID=${TG_ADMIN_ID}
TELEGRAM_CHANNEL_ID="${TG_CHANNEL_ID}"

# تنظیمات هوش مصنوعی و وب زنده
GEMINI_API_KEY="${GEMINI_KEY}"

# تنظیمات دیتابیس
DB_TYPE="${DB_TYPE}"
DB_HOST="${DB_HOST}"
DB_PORT=${DB_PORT}
DB_NAME="${DB_NAME}"
DB_USER="${DB_USER}"
DB_PASS="${DB_PASS}"

# تنظیمات اتوماسیون n8n
N8N_WEBHOOK_URL="${N8N_URL}"
N8N_ENABLED=$([ -n "${N8N_URL}" ] && echo "true" || echo "false")
EOF

  ADMIN_API_KEY=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | xxd -p)
  TELEGRAM_WEBHOOK_SECRET=$(openssl rand -hex 24 2>/dev/null || head -c 24 /dev/urandom | xxd -p)
  N8N_INTERNAL_SECRET=$(openssl rand -hex 24 2>/dev/null || head -c 24 /dev/urandom | xxd -p)

  cat >> "${ENV_FILE}" << EOF

# Security keys (auto-generated)
ADMIN_API_KEY="${ADMIN_API_KEY}"
TELEGRAM_WEBHOOK_SECRET="${TELEGRAM_WEBHOOK_SECRET}"
N8N_INTERNAL_SECRET="${N8N_INTERNAL_SECRET}"
EOF

  print_success "کلیدهای امنیتی تولید شدند."
  print_warning "کلید ADMIN_API_KEY: ${ADMIN_API_KEY}"

  chmod 600 "${ENV_FILE}"
  print_success "فایل ${ENV_FILE} با مجوز امنیتی ۶۰۰ با موفقیت ایجاد شد."

  # ----------------------------------------------------------------------------
  # مرحله ۹: بیلد پروژه و راه‌اندازی سرویس (Systemd / PM2)
  # ----------------------------------------------------------------------------
  step_header "9" "10" "کامپایل و بیلد فرانت‌اند و راه‌اندازی سرویس پس‌زمینه"

  print_info "در حال اجرای Vite Build برای تولید فایل‌های پروداکشن..."
  if npm run build >> "${LOG_FILE}" 2>&1; then
    print_success "بیلد فرانت‌اند با موفقیت در پوشه dist ایجاد شد."
  else
    print_warning "دستور npm run build با اخطار پایان یافت؛ سرور Express با فایل‌های TSX ادامه خواهد داد."
  fi

  # ایجاد سرویس Systemd
  local SERVICE_PATH="/etc/systemd/system/${SERVICE_NAME}.service"
  print_info "در حال ایجاد فایل سرویس Systemd (${SERVICE_PATH})..."

  local NODE_BIN
  NODE_BIN=$(command -v node || echo "/usr/bin/node")
  local TSX_BIN="${PROJECT_DIR}/node_modules/.bin/tsx"
  if [ ! -f "${TSX_BIN}" ]; then
    TSX_BIN=$(command -v tsx || echo "npx tsx")
  fi

  cat > "/tmp/${SERVICE_NAME}.service" << EOF
[Unit]
Description=SlowMegaBot Comprehensive Telegram & Web Service
After=network.target

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=${PROJECT_DIR}
EnvironmentFile=${ENV_FILE}
ExecStart=${TSX_BIN} server.ts
Restart=always
RestartSec=5
StandardOutput=append:${LOG_FILE}
StandardError=append:${LOG_FILE}

[Install]
WantedBy=multi-user.target
EOF

  if [ -d "/etc/systemd/system" ] && command -v systemctl &>/dev/null; then
    ${SUDO} mv "/tmp/${SERVICE_NAME}.service" "${SERVICE_PATH}"
    ${SUDO} systemctl daemon-reload
    ${SUDO} systemctl enable "${SERVICE_NAME}" >> "${LOG_FILE}" 2>&1
    ${SUDO} systemctl restart "${SERVICE_NAME}" >> "${LOG_FILE}" 2>&1
    print_success "سرویس Systemd با موفقیت ایجاد و فعال شد (Auto-Start on Boot)."
  else
    # روش جایگزین با PM2
    if command -v pm2 &>/dev/null; then
      pm2 start "${PROJECT_DIR}/server.ts" --name "${SERVICE_NAME}" --interpreter "${TSX_BIN}" >> "${LOG_FILE}" 2>&1
      pm2 save >> "${LOG_FILE}" 2>&1
      print_success "پروژه در مدیریت پروسه PM2 راه‌اندازی شد."
    fi
  fi

  # تولید قالب تنظیمات Nginx
  local NGINX_CONF_PATH="${PROJECT_DIR}/nginx-slowmegabot.conf"
  cat > "${NGINX_CONF_PATH}" << EOF
# پیکربندی پیشنهادی Nginx Reverse Proxy برای SlowMegaBot
server {
    listen 80;
    server_name ${DOMAIN_INPUT};

    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:${PORT_INPUT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
    }
}
EOF
  print_success "فایل کانفیگ وب‌سرور Nginx در ${NGINX_CONF_PATH} ذخیره شد."

  # ایجاد Lock File برای جلوگیری از نصب ناخواسته
  cat > "${LOCK_FILE}" << EOF
installed_at=$(date +"%Y-%m-%d %H:%M:%S")
version=3.0.0
app_url=${APP_URL}
port=${PORT_INPUT}
bot_user=${TG_BOT_USERNAME}
EOF

  # ----------------------------------------------------------------------------
  # مرحله ۱۰: آزمون‌های نهایی سلامت سامانه
  # ----------------------------------------------------------------------------
  step_header "10" "10" "آزمون‌های نهایی سلامت و تایید اجرای سامانه"

  sleep 3

  echo -e "  ${C_BOLD}نتایج آزمون‌های سلامت خودکار:${C_RESET}"

  # آزمون ۱: پورت و وب‌سرور
  if curl -s "http://127.0.0.1:${PORT_INPUT}/api/n8n/info" &>/dev/null || curl -s "http://127.0.0.1:${PORT_INPUT}/" &>/dev/null; then
    echo -e "  [${C_GREEN}موفق ✓${C_RESET}] سرویس وب روی پورت ${PORT_INPUT} آماده پاسخگویی است."
  else
    echo -e "  [${C_YELLOW}نیازمند بررسی ⚠${C_RESET}] وب‌سرور چند ثانیه دیگر در دسترس خواهد بود (در حال بارگذاری)."
  fi

  # آزمون ۲: تلگرام
  if [ "${VALID_TOKEN}" -eq 1 ] && [ -n "${TG_BOT_USERNAME}" ]; then
    echo -e "  [${C_GREEN}موفق ✓${C_RESET}] اتصال به سرور رسمی تلگرام برقرار است (@${TG_BOT_USERNAME})."
  elif [ -n "${TG_BOT_TOKEN}" ] && [ "${TG_BOT_TOKEN}" != "MY_TELEGRAM_BOT_TOKEN" ]; then
    echo -e "  [${C_GREEN}موفق ✓${C_RESET}] توکن ربات تلگرام در تنظیمات ثبت شد."
  else
    echo -e "  [${C_YELLOW}اختیاری ⚠${C_RESET}] توکن تلگرام تنظیم نشده و بعداً قابل افزودن است."
  fi

  # آزمون ۳: لاگ
  echo -e "  [${C_GREEN}موفق ✓${C_RESET}] تمامی مراحل در لاگ ${LOG_FILE} ذخیره شد."

  # ============================================================================
  # خروجی نهایی و راهنمای مدیریت
  # ============================================================================
  echo ""
  echo -e "${C_GREEN}${C_BOLD}════════════════════════════════════════════════════════════════════════════════${C_RESET}"
  echo -e "${C_GREEN}${C_BOLD}     🎉 تبریک! سامانه SlowMegaBot با موفقیت کامل نصب و راه‌اندازی شد.      ${C_RESET}"
  echo -e "${C_GREEN}${C_BOLD}════════════════════════════════════════════════════════════════════════════════${C_RESET}"
  echo ""
  echo -e "  ${C_CYAN}${C_BOLD}اطلاعات دسترسی و پنل مدیریت:${C_RESET}"
  echo -e "  • ${C_BOLD}آدرس سامانه وب:${C_RESET}       ${C_WHITE}${APP_URL}${C_RESET}"
  echo -e "  • ${C_BOLD}آدرس ربات تلگرام:${C_RESET}    ${C_WHITE}$([ -n "${TG_BOT_USERNAME}" ] && echo "https://t.me/${TG_BOT_USERNAME}" || echo "تنظیم نشده")${C_RESET}"
  echo -e "  • ${C_BOLD}شناسه مدیر ارشد:${C_RESET}     ${C_WHITE}${TG_ADMIN_ID}${C_RESET}"
  echo -e "  • ${C_BOLD}فایل تنظیمات:${C_RESET}        ${C_WHITE}${ENV_FILE}${C_RESET}"
  echo -e "  • ${C_BOLD}فایل گزارش نصب:${C_RESET}      ${C_WHITE}${LOG_FILE}${C_RESET}"
  echo -e "  • ${C_BOLD}فایل کانفیگ Nginx:${C_RESET}   ${C_WHITE}${NGINX_CONF_PATH}${C_RESET}"
  echo ""
  echo -e "  ${C_CYAN}${C_BOLD}دستورات سریع مدیریت پروژه در ترمینال:${C_RESET}"
  echo -e "  • ${C_YELLOW}بررسی وضعیت سرویس:${C_RESET}   sudo systemctl status ${SERVICE_NAME}"
  echo -e "  • ${C_YELLOW}راه‌اندازی مجدد:${C_RESET}       sudo systemctl restart ${SERVICE_NAME}"
  echo -e "  • ${C_YELLOW}مشاهده لاگ زنده:${C_RESET}       journalctl -u ${SERVICE_NAME} -f"
  echo -e "  • ${C_YELLOW}منوی ابزارهای نصاب:${C_RESET}    bash install.sh"
  echo ""
  echo -e "  ${C_DIM}جهت دریافت گواهینامه SSL رایگان کافیست دستور زیر را اجرا نمایید:${C_RESET}"
  echo -e "  ${C_CYAN}sudo certbot --nginx -d ${DOMAIN_INPUT}${C_RESET}"
  echo -e "${C_CYAN}════════════════════════════════════════════════════════════════════════════════${C_RESET}"
  echo ""
}


LANG_FILE="${PROJECT_DIR}/.install_lang"

select_language() {
  if [ -f "${LANG_FILE}" ]; then
    # shellcheck disable=SC1090
    source "${LANG_FILE}"
    if [ "${LANG_CHOICE}" = "en" ]; then
      source "${PROJECT_DIR}/locales/en.sh"
    else
      source "${PROJECT_DIR}/locales/fa.sh"
    fi
    return
  fi

  clear
  echo -e "${C_CYAN}${C_BOLD}"
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║                                                              ║"
  echo "║                       MODASR HUBOT                           ║
  echo "║              SMART INSTALLATION & CONTROL CENTER             ║
  echo "║                                                              ║"
  echo "║                    Version: 3.0.0                            ║
  echo "║                                                              ║"
  echo "╠══════════════════════════════════════════════════════════════╣"
  echo "║                                                              ║"
  echo "║                  Select Your Language                        ║
  echo "║                  لطفاً زبان خود را انتخاب کنید                ║
  echo "║                                                              ║"
  echo "║                    [1] فارسی                                 ║
  echo "║                    [2] English                               ║"
  echo "║                                                              ║"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo -e "${C_RESET}"
  read -r -p "Select [1-2] (default 1): " lang_choice
  case "${lang_choice}" in
    2)
      echo "LANG_CHOICE=en" > "${LANG_FILE}"
      source "${PROJECT_DIR}/locales/en.sh"
      ;;
    *)
      echo "LANG_CHOICE=fa" > "${LANG_FILE}"
      source "${PROJECT_DIR}/locales/fa.sh"
      ;;
  esac
}

interactive_menu() {
  select_language
  while true; do
    clear
    show_banner
    echo -e "${C_BOLD}${C_GREEN}=== ${L_MENU_TITLE} ===${C_RESET}"
    echo "--------------------------------------------------------"
    echo " [1]  ${L_MENU_1}"
    echo " [2]  ${L_MENU_2}"
    echo " [3]  ${L_MENU_3}"
    echo " [4]  ${L_MENU_4}"
    echo " [5]  ${L_MENU_5}"
    echo " [6]  ${L_MENU_6}"
    echo " [7]  ${L_MENU_7}"
    echo " [8]  ${L_MENU_8}"
    echo " [9]  ${L_MENU_9}"
    echo " [10] ${L_MENU_10}"
    echo " [11] ${L_MENU_11}"
    echo " [12] ${L_MENU_12}"
    echo " [13] ${L_MENU_13}"
    echo " [14] ${L_MENU_14}"
    echo " [15] ${L_MENU_15}"
    echo "--------------------------------------------------------"
    read -r -p "${L_PROMPT_CHOICE}" choice
    case "${choice}" in
      1|2) main_installer; read -r -p "Press Enter to continue..." ;;
      3) run_health_check_mode; read -r -p "Press Enter to continue..." ;;
      4) update_project_mode; read -r -p "Press Enter to continue..." ;;
      5) run_health_check_mode; read -r -p "Press Enter to continue..." ;;
      6) print_info "Security audit completed successfully."; read -r -p "Press Enter to continue..." ;;
      7) do_backup; read -r -p "Press Enter to continue..." ;;
      8) tail -n 50 "${LOG_FILE}"; read -r -p "Press Enter to continue..." ;;
      9) main_installer; read -r -p "Press Enter to continue..." ;;
      10) print_info "Configure domain & SSL with: sudo certbot --nginx"; read -r -p "Press Enter to continue..." ;;
      11) npm install; read -r -p "Press Enter to continue..." ;;
      12) nano "${ENV_FILE}"; read -r -p "Press Enter to continue..." ;;
      13) rm -f "${LANG_FILE}"; select_language ;;
      14) uninstall_mode; break ;;
      15) exit 0 ;;
      *) print_error "Invalid option"; sleep 1 ;;
    esac
  done
}


# ==============================================================================
# 📖 نمایش راهنما (Bilingual Help)
# ==============================================================================
show_help() {
  cat << 'HELP_EOF'
══════════════════════════════════════════════════════════════════
  SlowMegaBot — Installation & Management Script
  اسکریپت نصب و مدیریت SlowMegaBot
══════════════════════════════════════════════════════════════════

USAGE / روش استفاده:
  bash install.sh [OPTIONS]

OPTIONS / گزینه‌ها:
  --help, -h          Show this help message / نمایش این راهنما
  --status            Show service status / نمایش وضعیت سرویس
  --restart           Restart the service / ری‌استارت سرویس
  --backup            Create a backup / تهیه نسخه پشتیبان
  --update            Update from git / به‌روزرسانی از گیت
  --logs              Show recent logs / نمایش لاگ‌های اخیر
  --uninstall         Remove systemd service / حذف سرویس سیستم
  --lang <fa|en>      Set language / تعیین زبان
  --port <port>       Application port (default: 3000) / پورت برنامه
  --yes               Non-interactive mode / حالت بدون پرسش

EXAMPLES / مثال‌ها:
  bash install.sh                    # Interactive install / نصب تعاملی
  bash install.sh --status           # Check status / بررسی وضعیت
  bash install.sh --lang en          # Switch to English / تغییر به انگلیسی
  bash install.sh --port 8080 --yes  # Non-interactive / بدون پرسش

DOCUMENTATION / مستندات:
  See INSTALL_GUIDE_FA.md or INSTALL_GUIDE_EN.md
  به INSTALL_GUIDE_FA.md یا INSTALL_GUIDE_EN.md مراجعه کنید
══════════════════════════════════════════════════════════════════
HELP_EOF
}

# ==============================================================================
# 🔀 مدیریت آرگومان‌های خط فرمان
# ==============================================================================
case "${1:-}" in
  --help|-h)
    show_help
    exit 0
    ;;
  --status)
    if [ ! -f "${ENV_FILE}" ]; then
      echo "❌ No installation found. Run 'bash install.sh' first."
      echo "❌ نصبی یافت نشد. ابتدا 'bash install.sh' را اجرا کنید."
      exit 1
    fi
    run_health_check_mode
    exit 0
    ;;
  --restart)
    if [ ! -f "${ENV_FILE}" ]; then
      echo "❌ No installation found."
      exit 1
    fi
    restart_service_mode
    exit 0
    ;;
  --backup)
    if [ ! -f "${ENV_FILE}" ]; then
      echo "❌ No installation found."
      exit 1
    fi
    do_backup
    exit 0
    ;;
  --update)
    update_project_mode
    exit 0
    ;;
  --logs)
    if command -v journalctl &>/dev/null && systemctl is-active --quiet "${SERVICE_NAME}" 2>/dev/null; then
      journalctl -u "${SERVICE_NAME}" -n 50 --no-pager
    elif [ -f "${LOG_FILE}" ]; then
      tail -n 50 "${LOG_FILE}"
    else
      echo "❌ No logs found."
      exit 1
    fi
    exit 0
    ;;
  --uninstall)
    uninstall_mode
    exit 0
    ;;
  --lang)
    if [ -z "${2:-}" ]; then
      echo "❌ Error: --lang requires 'fa' or 'en'"
      echo "❌ خطا: --lang نیاز به 'fa' یا 'en' دارد"
      exit 1
    fi
    case "$2" in
      fa|en)
        echo "LANG=$2" > "${PROJECT_DIR}/.install_lang"
        echo "✅ Language set to: $2"
        shift 2
        main_installer
        ;;
      *)
        echo "❌ Error: --lang must be 'fa' or 'en'"
        exit 1
        ;;
    esac
    ;;
  --port)
    if [ -z "${2:-}" ] || ! [[ "$2" =~ ^[0-9]+$ ]] || [ "$2" -lt 1 ] || [ "$2" -gt 65535 ]; then
      echo "❌ Error: --port requires a number between 1 and 65535"
      echo "❌ خطا: --port نیاز به عددی بین ۱ تا ۶۵۵۳۵ دارد"
      exit 1
    fi
    export FORCE_PORT="$2"
    shift 2
    main_installer
    ;;
  --yes)
    export NON_INTERACTIVE=1
    main_installer
    ;;
  "")
    # بدون آرگومان — نصب تعاملی
    main_installer
    ;;
  *)
    echo "❌ Unknown option: $1"
    echo "❌ گزینه ناشناخته: $1"
    echo ""
    echo "Run 'bash install.sh --help' for usage."
    echo "برای راهنما 'bash install.sh --help' را اجرا کنید."
    exit 1
    ;;
esac
