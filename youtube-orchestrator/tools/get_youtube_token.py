"""YouTube OAuth refresh token olish vositasi (faqat 1 marta lokalda ishlatiladi).

Foydalanish:
1. Google Cloud Console → APIs & Services → Credentials → Create OAuth client ID
   (Desktop app). client_secrets.json'ni yuklab oling va shu papkaga qo'ying.
2. `python tools/get_youtube_token.py`
3. Brauzer ochiladi, kanal hisobi bilan kiring, ruxsat bering.
4. Terminalda ko'rsatilgan CLIENT_ID/CLIENT_SECRET/REFRESH_TOKEN'ni
   GitHub Secrets'ga joylang.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube.force-ssl",
]


def main() -> int:
    here = Path(__file__).resolve().parent.parent
    secrets = here / "client_secrets.json"
    if not secrets.exists():
        print("XATO: client_secrets.json topilmadi.")
        print("Google Cloud Console'dan OAuth Desktop client yarating va shu yerga qo'ying:")
        print(f"  {secrets}")
        return 1

    flow = InstalledAppFlow.from_client_secrets_file(str(secrets), SCOPES)
    creds = flow.run_local_server(port=0, prompt="consent", access_type="offline")

    data = json.loads(secrets.read_text())["installed"]
    print("\n" + "=" * 60)
    print("Quyidagilarni GitHub Secrets'ga qo'ying:")
    print("=" * 60)
    print(f"YOUTUBE_CLIENT_ID={data['client_id']}")
    print(f"YOUTUBE_CLIENT_SECRET={data['client_secret']}")
    print(f"YOUTUBE_REFRESH_TOKEN={creds.refresh_token}")
    print("=" * 60)
    return 0


if __name__ == "__main__":
    sys.exit(main())
