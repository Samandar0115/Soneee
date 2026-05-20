"""Trend agent — niche'lar bo'yicha mavzu topadi.

YouTube Data API key bor bo'lsa, real trend'lardan foydalanadi.
Bo'lmasa, LLM (Gemini yoki Pollinations) o'zining bilimi bilan taklif qiladi.
"""
from __future__ import annotations

import logging
import os
from pathlib import Path

import requests

from .llm_client import complete

log = logging.getLogger(__name__)

YT_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"


def _yt_recent_titles(query: str, api_key: str, limit: int = 10) -> list[str]:
    from datetime import datetime, timedelta, timezone
    published_after = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat(timespec="seconds")
    params = {
        "part": "snippet", "q": query, "type": "video",
        "maxResults": limit, "order": "viewCount",
        "publishedAfter": published_after, "key": api_key,
    }
    try:
        r = requests.get(YT_SEARCH_URL, params=params, timeout=20)
        r.raise_for_status()
        return [item["snippet"]["title"] for item in r.json().get("items", [])]
    except Exception as exc:
        log.warning("YouTube search xato (%s): %s", query, exc)
        return []


PROMPT = """Sen O'zbek tilidagi YouTube kanalining kontent-strategisan.

Kanal niche'lari:
{niches}

{titles_block}

Vazifang:
- Shu yo'nalishlarda, O'zbek auditoriyasi uchun {count} ta YANGI VIDEO MAVZUSI taklif qil.
- Mavzular O'zbek tilida bo'lsin, qisqa va aniq, click-worthy.
- Plagiat emas — mavzu shu yo'nalishda yangi nuqtai nazardan.
- Har bir niche'dan mutanosib taqsimla.
- Ta'limiy va amaliy bo'lsin.

FAQAT ro'yxat qaytar, har qatorda bitta mavzu, raqamlar yoki belgilar yo'q.
"""


def discover_topics(niches: list[str], *, count: int = 15, model_name: str = "gemini-2.0-flash") -> list[str]:
    yt_search_key = os.environ.get("YOUTUBE_DATA_API_KEY", "")

    all_titles: list[str] = []
    if yt_search_key:
        for niche in niches:
            all_titles.extend(_yt_recent_titles(niche, yt_search_key, limit=6))

    if all_titles:
        titles_block = "Quyida shu niche'lar bo'yicha hozir YouTube'da trend'da turgan video sarlavhalari:\n" + \
                       "\n".join(f"- {t}" for t in all_titles[:30])
    else:
        titles_block = "(Trend ma'lumotlari yo'q — niche'larga asoslanib o'zing taklif qil.)"

    prompt = PROMPT.format(
        niches="\n".join(f"- {n}" for n in niches),
        titles_block=titles_block,
        count=count,
    )
    raw = complete(prompt, gemini_model=model_name)
    topics: list[str] = []
    for line in raw.splitlines():
        cleaned = line.strip().lstrip("-•0123456789.) ").strip()
        if cleaned and len(cleaned) < 200 and not cleaned.lower().startswith("mavzu"):
            topics.append(cleaned)
    log.info("Trend agent %d ta mavzu topdi", len(topics))
    return topics[:count]


def refill_queue(queue_path: Path, niches: list[str], *, below: int = 5,
                 count: int = 15, model_name: str = "gemini-2.0-flash") -> int:
    existing: list[str] = []
    if queue_path.exists():
        for line in queue_path.read_text(encoding="utf-8").splitlines():
            s = line.strip()
            if s and not s.startswith("#"):
                existing.append(s)
    if len(existing) >= below:
        log.info("Queue'da %d ta mavzu bor — trend ishga tushirilmadi.", len(existing))
        return 0
    new_topics = discover_topics(niches, count=count, model_name=model_name)
    existing_lower = {t.lower() for t in existing}
    fresh = [t for t in new_topics if t.lower() not in existing_lower]

    header = "# Trend agent tomonidan avtomatik qo'shilgan mavzular\n"
    original = queue_path.read_text(encoding="utf-8") if queue_path.exists() else ""
    appended = original.rstrip() + "\n\n" + header + "\n".join(fresh) + "\n"
    queue_path.write_text(appended, encoding="utf-8")
    log.info("Queue'ga %d ta yangi mavzu qo'shildi.", len(fresh))
    return len(fresh)
