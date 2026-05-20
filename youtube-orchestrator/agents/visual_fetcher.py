"""Vizual yig'uvchi — Pexels (key bor bo'lsa) yoki Pollinations.ai (bepul, kalitsiz).

PEXELS_API_KEY o'rnatilgan bo'lsa, stok video/rasm yuklab oladi.
O'rnatilmagan yoki muvaffaqiyatsiz bo'lsa — Pollinations.ai orqali
sahnaga mos rasm generatsiya qiladi (bepul, kalitsiz).
"""
from __future__ import annotations

import logging
import os
import urllib.parse
from pathlib import Path

import requests

log = logging.getLogger(__name__)

PEXELS_VIDEO_URL = "https://api.pexels.com/videos/search"
PEXELS_PHOTO_URL = "https://api.pexels.com/v1/search"
POLLINATIONS_IMAGE_URL = "https://image.pollinations.ai/prompt/{prompt}"


def _has_pexels() -> bool:
    return bool(os.environ.get("PEXELS_API_KEY"))


def _pexels_headers() -> dict:
    return {"Authorization": os.environ["PEXELS_API_KEY"]}


def _pick_video_file(videos: list[dict], min_w: int = 1280) -> str | None:
    for v in videos:
        candidates = [f for f in v.get("video_files", []) if f.get("file_type") == "video/mp4"]
        candidates = [f for f in candidates if (f.get("width") or 0) >= min_w]
        if not candidates:
            continue
        return sorted(candidates, key=lambda f: f["width"])[0]["link"]
    return None


def _pexels_video(query: str, out_path: Path, orientation: str) -> Path | None:
    try:
        r = requests.get(
            PEXELS_VIDEO_URL,
            headers=_pexels_headers(),
            params={"query": query, "per_page": 10, "orientation": orientation},
            timeout=30,
        )
        r.raise_for_status()
        url = _pick_video_file(r.json().get("videos", []))
        if not url:
            return None
        with requests.get(url, stream=True, timeout=120) as resp:
            resp.raise_for_status()
            with out_path.open("wb") as f:
                for chunk in resp.iter_content(chunk_size=1 << 16):
                    f.write(chunk)
        return out_path
    except Exception as exc:
        log.warning("Pexels video xato (%s): %s", query, exc)
        return None


def _pexels_photo(query: str, out_path: Path, orientation: str) -> Path | None:
    try:
        r = requests.get(
            PEXELS_PHOTO_URL,
            headers=_pexels_headers(),
            params={"query": query, "per_page": 5, "orientation": orientation},
            timeout=30,
        )
        r.raise_for_status()
        photos = r.json().get("photos", [])
        if not photos:
            return None
        url = photos[0]["src"]["large2x"]
        with requests.get(url, stream=True, timeout=60) as resp:
            resp.raise_for_status()
            with out_path.open("wb") as f:
                for chunk in resp.iter_content(chunk_size=1 << 16):
                    f.write(chunk)
        return out_path
    except Exception as exc:
        log.warning("Pexels rasm xato (%s): %s", query, exc)
        return None


def _pollinations_image(query: str, out_path: Path, *, width: int, height: int) -> Path:
    """Pollinations.ai bilan rasm generatsiya. Kalit kerak emas."""
    enriched = f"{query}, cinematic, high quality, photorealistic, professional"
    encoded = urllib.parse.quote(enriched)
    url = POLLINATIONS_IMAGE_URL.format(prompt=encoded) + \
        f"?width={width}&height={height}&nologo=true&model=flux&enhance=true"
    log.info("Pollinations rasm so'ralmoqda: %s", query[:60])
    r = requests.get(url, timeout=180)
    r.raise_for_status()
    out_path.write_bytes(r.content)
    return out_path


def fetch_visual(query: str, out_dir: Path, index: int, *, orientation: str = "landscape") -> tuple[Path, str]:
    """Sahna uchun rasm/video oladi. Strategiya:
    1. PEXELS_API_KEY bor bo'lsa: stok video → stok rasm.
    2. Aks holda yoki muvaffaqiyatsiz: Pollinations.ai rasm.
    """
    out_dir.mkdir(parents=True, exist_ok=True)
    video_path = out_dir / f"scene_{index:02d}.mp4"
    photo_path = out_dir / f"scene_{index:02d}.jpg"

    if _has_pexels():
        if _pexels_video(query, video_path, orientation):
            return video_path, "video"
        if _pexels_photo(query, photo_path, orientation):
            return photo_path, "image"
        log.info("Pexels'da topilmadi — Pollinations'ga o'tilmoqda")

    # Pollinations fallback (har doim ishlaydi)
    if orientation == "portrait":
        width, height = 1080, 1920
    else:
        width, height = 1920, 1080
    _pollinations_image(query, photo_path, width=width, height=height)
    return photo_path, "image"
