"""Trend agent — niche'lar bo'yicha YouTube/Google'da dolzarb mavzularni topadi.

Strategiya:
1. Har niche uchun YouTube Search API'dan oxirgi 7 kundagi top viewlangan videolarni ol.
2. Ularning sarlavhalarini Gemini'ga ber: "shu yo'nalishlardan O'zbekcha kanal uchun
   N ta yangi mavzu taklif qil" — strukturalangan ro'yxat qaytaradi.
3. Mavzularni queue.txt'ga qo'shadi (dublikatlar olib tashlanadi).
"""
from __future__ import annotations

import logging
import os
from pathlib import Path

import google.generativeai as genai
import requests

log = logging.getLogger(__name__)

YT_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"


def _yt_recent_titles(query: str, api_key: str, limit: int = 10) -> list[str]:
    """Berilgan so'rov bo'yicha YouTube'dan oxirgi haftaning top videolar sarlavhalari."""
    from datetime import datetime, timedelta, timezone
    published_after = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat(timespec="seconds")
    params = {
        "part": "snippet",
        "q": query,
        "type": "video",
        "maxResults": limit,
        "order": "viewCount",
        "publishedAfter": published_after,
        "key": api_key,
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

Quyida shu niche'lar bo'yicha global YouTube'da hozir trend'da turgan video sarlavhalari (asosan inglizcha):
{titles}

Vazifang:
- Shu trend'lar ruhida, O'zbek auditoriyasi uchun {count} ta YANGI VIDEO MAVZUSI taklif qil.
- Mavzular O'zbek tilida bo'lsin, qisqa va aniq, click-worthy.
- Plagiat emas — mavzu shu yo'nalishda yangi nuqtai nazardan.
- Har bir niche'dan mutanosib taqsimla.

FAQAT ro'yxat qaytar, har qatorda bitta mavzu, raqamlar yoki belgilar yo'q.
"""


def discover_topics(niches: list[str], *, count: int = 15, model_name: str = "gemini-2.0-flash") -> list[str]:
    yt_key = os.environ.get("YOUTUBE_DATA_API_KEY") or os.environ.get("GEMINI_API_KEY")  # noqa: F841
    # Note: search uchun YouTube Data API key kerak. Agar yo'q bo'lsa, Gemini'ga toza promtni beramiz.
    yt_search_key = os.environ.get("YOUTUBE_DATA_API_KEY", "")

    all_titles: list[str] = []
    if yt_search_key:
        for niche in niches:
            all_titles.extend(_yt_recent_titles(niche, yt_search_key, limit=6))
    if not all_titles:
        all_titles = [f"(trend ma'lumotsiz — niche bo'yicha taxmin qil: {n})" for n in niches]

    genai.configure(api_key=os.environ["GEMINI_API_KEY"])
    model = genai.GenerativeModel(model_name)
    prompt = PROMPT.format(
        niches="\n".join(f"- {n}" for n in niches),
        titles="\n".join(f"- {t}" for t in all_titles[:30]),
        count=count,
    )
    resp = model.generate_content(prompt).text
    topics: list[str] = []
    for line in resp.splitlines():
        cleaned = line.strip().lstrip("-•0123456789.) ").strip()
        if cleaned and len(cleaned) < 200:
            topics.append(cleaned)
    log.info("Trend agent %d ta mavzu topdi", len(topics))
    return topics[:count]


def refill_queue(queue_path: Path, niches: list[str], *, below: int = 5, count: int = 15, model_name: str = "gemini-2.0-flash") -> int:
    """Queue past bo'lsa, yangi mavzular qo'shadi. Qo'shilgan sonni qaytaradi."""
    existing = []
    if queue_path.exists():
        for line in queue_path.read_text(encoding="utf-8").splitlines():
            s = line.strip()
            if s and not s.startswith("#"):
                existing.append(s)
    if len(existing) >= below:
        log.info("Queue'da %d ta mavzu bor — trend ishga tushirilmadi.", len(existing))
        return 0
    new_topics = discover_topics(niches, count=count, model_name=model_name)
    # Dublikatlar olib tashlash
    existing_lower = {t.lower() for t in existing}
    fresh = [t for t in new_topics if t.lower() not in existing_lower]

    header = "# Trend agent tomonidan avtomatik qo'shilgan mavzular\n"
    if queue_path.exists():
        original = queue_path.read_text(encoding="utf-8")
    else:
        original = ""
    appended = original.rstrip() + "\n\n" + header + "\n".join(fresh) + "\n"
    queue_path.write_text(appended, encoding="utf-8")
    log.info("Queue'ga %d ta yangi mavzu qo'shildi.", len(fresh))
    return len(fresh)
