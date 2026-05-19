"""YouTube OAuth refresh token olish vositasi.

2 ta rejim:

1. AUTO (lokal kompyuter — brauzer bilan):
   python tools/get_youtube_token.py

2. MANUAL (Codespaces, Cloud Shell, server — brauzersiz):
   python tools/get_youtube_token.py --manual
   → terminalda URL chiqadi → URL'ni telefon/kompyuter brauzerida oching →
     ruxsat bering → "Bu sayt ulanib bo'lmadi" sahifasi ochiladi → SHU SAHIFANING
     URL'INI manzil qatoridan nusxalang va terminalga yopishtiring.

Har ikki rejim ham natijada 3 ta qator chiqaradi —
ularni GitHub Secrets'ga qo'yasiz.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from urllib.parse import urlparse, parse_qs

from google_auth_oauthlib.flow import Flow, InstalledAppFlow

SCOPES = [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube.force-ssl",
]


def _print_result(client_id: str, client_secret: str, refresh_token: str | None) -> None:
    print("\n" + "=" * 60)
    print("Quyidagilarni GitHub Secrets'ga qo'ying:")
    print("(Settings → Secrets and variables → Actions → New repository secret)")
    print("=" * 60)
    print(f"YOUTUBE_CLIENT_ID={client_id}")
    print(f"YOUTUBE_CLIENT_SECRET={client_secret}")
    if refresh_token:
        print(f"YOUTUBE_REFRESH_TOKEN={refresh_token}")
    else:
        print("YOUTUBE_REFRESH_TOKEN=(MUAMMO: refresh_token kelmadi — qaytadan urinib ko'ring)")
    print("=" * 60)
    print("\nKalitlarni qo'ygach `client_secrets.json` faylini o'chiring!")


def auto_flow(secrets: Path) -> tuple[str, str, str]:
    flow = InstalledAppFlow.from_client_secrets_file(str(secrets), SCOPES)
    creds = flow.run_local_server(port=0, prompt="consent", access_type="offline")
    data = json.loads(secrets.read_text())["installed"]
    return data["client_id"], data["client_secret"], creds.refresh_token


def manual_flow(secrets: Path) -> tuple[str, str, str]:
    """Brauzersiz muhitlar uchun (Codespaces, Cloud Shell)."""
    data = json.loads(secrets.read_text())["installed"]
    # Bu redirect_uri haqiqatan ham hech qayerga ulamaydi — bizga faqat URL'dagi `code` kerak.
    redirect_uri = "http://localhost:8080"
    flow = Flow.from_client_secrets_file(str(secrets), SCOPES, redirect_uri=redirect_uri)
    auth_url, _ = flow.authorization_url(access_type="offline", prompt="consent")

    print("\n" + "=" * 60)
    print("1-QADAM: Quyidagi URL'ni TELEFONINGIZ yoki BOSHQA KOMPYUTERINGIZ brauzerida oching:")
    print("=" * 60)
    print(auth_url)
    print("=" * 60)
    print("\n2-QADAM: Google hisobi bilan kiring (kanal egasi bo'lgan akkaunt!) va ruxsat bering.")
    print("3-QADAM: 'Bu saytga ulanib bo'lmadi' xato sahifasi ochiladi — bu NORMAL.")
    print("4-QADAM: O'sha sahifaning yuqoridagi manzil qatori (URL) ni TO'LIQ nusxalang.")
    print("         (Misol: http://localhost:8080/?state=xxx&code=4/0AVMxxx&scope=...)")
    print()
    redirected = input("To'liq URL'ni shu yerga yopishtiring va Enter bosing:\n> ").strip()

    if "code=" not in redirected:
        print("XATO: URL'da `code=...` topilmadi. Qaytadan urinib ko'ring.")
        sys.exit(1)

    parsed = urlparse(redirected)
    code = parse_qs(parsed.query).get("code", [None])[0]
    if not code:
        print("XATO: code parametri ajratib olinmadi.")
        sys.exit(1)

    flow.fetch_token(code=code)
    return data["client_id"], data["client_secret"], flow.credentials.refresh_token


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--manual",
        action="store_true",
        help="Brauzer auto-callback ishlamaydigan muhit (Codespaces, Cloud Shell) uchun",
    )
    args = parser.parse_args()

    here = Path(__file__).resolve().parent.parent
    secrets = here / "client_secrets.json"
    if not secrets.exists():
        print(f"XATO: {secrets} topilmadi.")
        print("Google Cloud Console → Credentials → OAuth Desktop client → DOWNLOAD JSON")
        print(f"va shu yerga `client_secrets.json` nomi bilan qo'ying.")
        return 1

    if args.manual:
        cid, csec, rtoken = manual_flow(secrets)
    else:
        cid, csec, rtoken = auto_flow(secrets)

    _print_result(cid, csec, rtoken)
    return 0


if __name__ == "__main__":
    sys.exit(main())
