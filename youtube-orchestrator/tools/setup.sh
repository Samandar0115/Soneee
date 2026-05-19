#!/usr/bin/env bash
# Codespaces yoki har qanday Linux'da bitta buyruq bilan setup.
# Foydalanish: bash tools/setup.sh

set -e

cd "$(dirname "$0")/.."

echo ""
echo "=== Soneee YouTube Orchestrator — Avto-Setup ==="
echo ""

echo "[1/4] Tizim paketlari (ffmpeg)..."
if ! command -v ffmpeg &> /dev/null; then
    if command -v apt-get &> /dev/null; then
        sudo apt-get update -qq && sudo apt-get install -y -qq ffmpeg fonts-dejavu-core
    else
        echo "DIQQAT: ffmpeg topilmadi va apt-get yo'q. Qo'lda o'rnating."
    fi
else
    echo "  ffmpeg allaqachon o'rnatilgan."
fi

echo "[2/4] Python kutubxonalar..."
pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt
echo "  Tayyor."

echo "[3/4] Tashxis..."
python tools/doctor.py || true

echo ""
echo "[4/4] Keyingi qadamlar:"
echo ""
echo "  Agar kalitlar yo'q bo'lsa:"
echo "  1. client_secrets.json'ni shu papkaga sudrab tashlang"
echo "  2. python tools/get_youtube_token.py --manual"
echo "  3. Chiqqan 3 ta token'ni GitHub Secrets'ga qo'ying"
echo "  4. Boshqa kalitlarni ham qo'ying (GEMINI_API_KEY, PEXELS_API_KEY)"
echo ""
echo "  Yo'riqnoma: SETUP_QADAMMA_QADAM.md"
echo ""
