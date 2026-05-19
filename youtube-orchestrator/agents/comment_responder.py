"""Sharhlarga javob beruvchi agent — yangi sharhlarni oladi, Gemini orqali javob yozadi."""
from __future__ import annotations

import json
import logging
import os
from pathlib import Path

import google.generativeai as genai
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

log = logging.getLogger(__name__)

SCOPES = ["https://www.googleapis.com/auth/youtube.force-ssl"]
STATE_PATH = Path(__file__).resolve().parent.parent / "topics" / "_replied.json"

REPLY_PROMPT = """Sen YouTube kanalining muloyim, do'stona moderatorisan.

Video sarlavhasi: {title}
Tomoshabin sharhi: "{comment}"

Quyidagicha javob yoz:
- {style}
- 1-2 jumladan oshmasin
- Spamga o'xshamasin, jonli bo'lsin
- Kanal nomi, link, reklama yo'q
- Tomoshabin haqorat qilsa — javob berma, "skip" deb yoz

FAQAT javob matnini yoz (yoki "skip").
"""


def _yt_client() -> "googleapiclient.discovery.Resource":
    creds = Credentials(
        token=None,
        refresh_token=os.environ["YOUTUBE_REFRESH_TOKEN"],
        token_uri="https://oauth2.googleapis.com/token",
        client_id=os.environ["YOUTUBE_CLIENT_ID"],
        client_secret=os.environ["YOUTUBE_CLIENT_SECRET"],
        scopes=SCOPES,
    )
    return build("youtube", "v3", credentials=creds, cache_discovery=False)


def _load_replied() -> set[str]:
    if STATE_PATH.exists():
        try:
            return set(json.loads(STATE_PATH.read_text()))
        except Exception:
            return set()
    return set()


def _save_replied(replied: set[str]) -> None:
    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    STATE_PATH.write_text(json.dumps(sorted(replied)))


def _gemini_reply(comment_text: str, video_title: str, style: str, model_name: str) -> str | None:
    genai.configure(api_key=os.environ["GEMINI_API_KEY"])
    model = genai.GenerativeModel(model_name)
    prompt = REPLY_PROMPT.format(title=video_title, comment=comment_text, style=style)
    out = model.generate_content(prompt).text.strip()
    if not out or out.lower().startswith("skip"):
        return None
    return out


def respond_to_comments(
    *,
    max_replies: int = 20,
    style: str = "muloyim, qisqa, do'stona",
    model_name: str = "gemini-2.0-flash",
) -> int:
    yt = _yt_client()
    replied = _load_replied()

    # Kanaldagi oxirgi 25 video
    channels = yt.channels().list(part="contentDetails", mine=True).execute()
    uploads_playlist = channels["items"][0]["contentDetails"]["relatedPlaylists"]["uploads"]
    playlist = yt.playlistItems().list(
        part="contentDetails,snippet", playlistId=uploads_playlist, maxResults=25
    ).execute()

    sent = 0
    for item in playlist.get("items", []):
        if sent >= max_replies:
            break
        video_id = item["contentDetails"]["videoId"]
        video_title = item["snippet"]["title"]

        threads = yt.commentThreads().list(
            part="snippet", videoId=video_id, maxResults=20, order="time", textFormat="plainText",
        ).execute()

        for thread in threads.get("items", []):
            if sent >= max_replies:
                break
            cid = thread["id"]
            if cid in replied:
                continue
            top = thread["snippet"]["topLevelComment"]
            if top["snippet"].get("authorChannelId", {}).get("value") == channels["items"][0].get("id"):
                replied.add(cid)
                continue
            text = top["snippet"]["textDisplay"]
            try:
                reply = _gemini_reply(text, video_title, style, model_name)
            except Exception as exc:
                log.warning("Gemini xato berdi: %s", exc)
                continue
            if not reply:
                replied.add(cid)
                continue
            try:
                yt.comments().insert(
                    part="snippet",
                    body={"snippet": {"parentId": cid, "textOriginal": reply}},
                ).execute()
                log.info("Javob yuborildi (%s): %s", video_id, reply[:60])
                replied.add(cid)
                sent += 1
            except Exception as exc:
                log.warning("Javob yuborilmadi: %s", exc)

    _save_replied(replied)
    log.info("Jami %d ta javob yuborildi", sent)
    return sent
