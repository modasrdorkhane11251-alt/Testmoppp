#!/usr/bin/env bash
# Automated tests for Modasr Hubot Bilingual Installer & Deployment Manager

echo "=== RUNNING MODASR HUBOT INSTALLER TEST SUITE ==="

if bash -n install.sh; then
  echo "[PASS] install.sh syntax check passed"
else
  echo "[FAIL] install.sh syntax check failed"
  exit 1
fi

if [ -f "locales/fa.sh" ] && [ -f "locales/en.sh" ]; then
  echo "[PASS] Bilingual locale files exist"
  if source locales/fa.sh && [ -n "${L_MENU_TITLE}" ]; then
    echo "[PASS] Persian locale sourced successfully"
  else
    echo "[FAIL] Persian locale failed to source"
    exit 1
  fi
  if source locales/en.sh && [ -n "${L_MENU_TITLE}" ]; then
    echo "[PASS] English locale sourced successfully"
  else
    echo "[FAIL] English locale failed to source"
    exit 1
  fi
else
  echo "[FAIL] Locale files missing"
  exit 1
fi

echo "LANG_CHOICE=en" > .install_lang
if bash install.sh --status > /dev/null 2>&1; then
  echo "[PASS] install.sh --status executed successfully with English locale preference"
else
  echo "[FAIL] install.sh --status failed"
  exit 1
fi
rm -f .install_lang

for doc in README.md README_FA.md INSTALL_GUIDE_FA.md INSTALL_GUIDE_EN.md; do
  if [ -f "$doc" ] && [ -s "$doc" ]; then
    echo "[PASS] Documentation file $doc exists and is non-empty"
  else
    echo "[FAIL] Documentation file $doc missing or empty"
    exit 1
  fi
done

echo "=== ALL INSTALLER TESTS PASSED SUCCESSFULLY ==="
