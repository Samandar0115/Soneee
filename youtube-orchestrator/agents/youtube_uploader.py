"""YouTube uploader — YouTube Data API v3 orqali video va thumbnail yuklaydi."""
from __future__ import annotations

import logging
import os
from pathlib import Path

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

log = logging.getLogger(__name__)

SCOPES = [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube.force-ssl",
]
TOKEN_URI = "https://oauth2.googleapis.com/token"


def _credentials() -> Credentials:
    client_id = os.environ.get("YOUTUBE_CLIENT_ID")
    client_secret = os.environ.get("YOUTUBE_CLIENT_SECRET")
    refresh_token = os.environ.get("YOUTUBE_REFRESH_TOKEN")
    if not all([client_id, client_secret, refresh_token]):
        raise RuntimeError("YOUTUBE_CLIENT_ID/CLIENT_SECRET/REFRESH_TOKEN secrets'da yo'q")
    return Credentials(
        token=None,
        refresh_token=refresh_token,
        token_uri=TOKEN_URI,
        client_id=client_id,
        client_secret=client_secret,
        scopes=SCOPES,
    )


def _client():
    return build("youtube", "v3", credentials=_credentials(), cache_discovery=False)


def upload_video(
    video_path: Path,
    thumbnail_path: Path | None,
    *,
    title: str,
    description: str,
    tags: list[str],
    privacy_status: str = "public",
    category_id: str = "22",  # People & Blogs
) -> str:
    yt = _client()

    body = {
        "snippet": {
            "title": title[:100],
            "description": description[:4900],
            "tags": tags[:30],
            "categoryId": category_id,
        },
        "status": {
            "privacyStatus": privacy_status,
            "selfDeclaredMadeForKids": False,
        },
    }

    media = MediaFileUpload(str(video_path), chunksize=-1, resumable=True, mimetype="video/mp4")
    request = yt.videos().insert(part="snippet,status", body=body, media_body=media)

    log.info("YouTube'ga yuklanmoqda: %s", title)
    response = None
    while response is None:
        status, response = request.next_chunk()
        if status:
            log.info("Progress: %d%%", int(status.progress() * 100))
    video_id = response["id"]
    log.info("Yuklandi: https://youtube.com/watch?v=%s", video_id)

    if thumbnail_path and thumbnail_path.exists():
        try:
            yt.thumbnails().set(
                videoId=video_id,
                media_body=MediaFileUpload(str(thumbnail_path), mimetype="image/jpeg"),
            ).execute()
            log.info("Thumbnail o'rnatildi")
        except Exception as exc:
            # Yangi kanallarda thumbnail uchun hisob tasdiqlangan bo'lishi kerak
            log.warning("Thumbnail o'rnatilmadi: %s", exc)

    return video_id
