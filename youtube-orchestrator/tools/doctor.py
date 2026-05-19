"""Tashxis skripti — sozlash to'g'rimi yoki yo'q, aniq aytadi.

Foydalanish: python tools/doctor.py
"""
from __future__ import annotations

import os
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def check(name: str, ok: bool, hint: str = "") -> bool:
    mark = "✅" if ok else "❌"
    print(f"  {mark} {name}")
    if not ok and hint:
        print(f"     → {hint}")
    return ok


def main() -> int:
    print("\n=== Soneee YouTube Orchestrator — Tashxis ===\n")
    all_ok = True

    print("1. Tizim:")
    all_ok &= check(
        "Python 3.10+",
        sys.version_info >= (3, 10),
        f"Hozirgi: {sys.version_info.major}.{sys.version_info.minor}. 3.10+ kerak.",
    )
    all_ok &= check(
        "ffmpeg",
        shutil.which("ffmpeg") is not None,
        "sudo apt-get install ffmpeg (Codespaces'da kerak emas — Actions'da o'rnatiladi)",
    )

    print("\n2. Fayllar:")
    all_ok &= check("config.yaml", (ROOT / "config.yaml").exists())
    all_ok &= check("requirements.txt", (ROOT / "requirements.txt").exists())
    all_ok &= check("topics/queue.txt", (ROOT / "topics" / "queue.txt").exists())

    print("\n3. Python kutubxonalar:")
    for pkg in ["google.generativeai", "edge_tts", "requests", "googleapiclient", "yaml", "PIL"]:
        try:
            __import__(pkg)
            check(pkg, True)
        except ImportError:
            check(pkg, False, "pip install -r requirements.txt")
            all_ok = False

    print("\n4. Muhit o'zgaruvchilari (lokal test uchun .env; Actions'da Secrets):")
    # .env'ni yuklash (mavjud bo'lsa)
    env_file = ROOT / ".env"
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            if "=" in line and not line.strip().startswith("#"):
                k, _, v = line.partition("=")
                if k.strip() and v.strip() and k.strip() not in os.environ:
                    os.environ[k.strip()] = v.strip()

    required = ["GEMINI_API_KEY", "PEXELS_API_KEY",
                "YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET", "YOUTUBE_REFRESH_TOKEN"]
    optional = ["YOUTUBE_DATA_API_KEY"]

    for key in required:
        all_ok &= check(key, bool(os.environ.get(key)), f"{key} secret kerak")
    for key in optional:
        check(key, bool(os.environ.get(key)), "(ixtiyoriy, trend agent uchun)")

    print("\n5. API ishlashini tekshirish (kalitlar mavjud bo'lganda):")
    if os.environ.get("GEMINI_API_KEY"):
        try:
            import google.generativeai as genai
            genai.configure(api_key=os.environ["GEMINI_API_KEY"])
            model = genai.GenerativeModel("gemini-2.0-flash")
            resp = model.generate_content("Reply with just the word 'OK'.")
            check("Gemini API javob beradi", "ok" in resp.text.lower())
        except Exception as exc:
            check("Gemini API", False, f"Xato: {exc}")
            all_ok = False

    if os.environ.get("PEXELS_API_KEY"):
        try:
            import requests
            r = requests.get(
                "https://api.pexels.com/v1/search?query=test&per_page=1",
                headers={"Authorization": os.environ["PEXELS_API_KEY"]},
                timeout=10,
            )
            check("Pexels API javob beradi", r.status_code == 200, f"HTTP {r.status_code}")
            if r.status_code != 200:
                all_ok = False
        except Exception as exc:
            check("Pexels API", False, f"Xato: {exc}")
            all_ok = False

    if all(os.environ.get(k) for k in ["YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET", "YOUTUBE_REFRESH_TOKEN"]):
        try:
            from google.oauth2.credentials import Credentials
            from googleapiclient.discovery import build
            creds = Credentials(
                token=None,
                refresh_token=os.environ["YOUTUBE_REFRESH_TOKEN"],
                token_uri="https://oauth2.googleapis.com/token",
                client_id=os.environ["YOUTUBE_CLIENT_ID"],
                client_secret=os.environ["YOUTUBE_CLIENT_SECRET"],
                scopes=["https://www.googleapis.com/auth/youtube.upload"],
            )
            yt = build("youtube", "v3", credentials=creds, cache_discovery=False)
            resp = yt.channels().list(part="snippet", mine=True).execute()
            if resp.get("items"):
                channel = resp["items"][0]["snippet"]["title"]
                check(f"YouTube ulandi: {channel}", True)
            else:
                check("YouTube ulandi", False, "Kanal topilmadi — boshqa hisob bilan kirilgan bo'lishi mumkin")
                all_ok = False
        except Exception as exc:
            check("YouTube OAuth", False, f"Token muammosi: {exc}")
            all_ok = False

    print("\n" + "=" * 50)
    if all_ok:
        print("✅ HAMMASI TAYYOR. Workflow'ni ishga tushiring.")
        return 0
    else:
        print("❌ Yuqoridagi muammolarni hal qiling, keyin qaytadan urinib ko'ring.")
        print("Yo'riqnoma: youtube-orchestrator/SETUP_QADAMMA_QADAM.md")
        return 1


if __name__ == "__main__":
    sys.exit(main())
