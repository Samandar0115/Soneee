"""Vizual yig'uvchi — Pexels API'dan stok video yoki rasm yuklab oladi."""
from __future__ import annotations

import logging
import os
from pathlib import Path

import requests

log = logging.getLogger(__name__)

PEXELS_VIDEO_URL = "https://api.pexels.com/videos/search"
PEXELS_PHOTO_URL = "https://api.pexels.com/v1/search"


def _headers() -> dict:
    key = os.environ.get("PEXELS_API_KEY")
    if not key:
        raise RuntimeError("PEXELS_API_KEY yo'q")
    return {"Authorization": key}


def _pick_video_file(videos: list[dict], min_w: int = 1280) -> str | None:
    """Pexels javobidan eng mos sifatdagi MP4 URL'ini tanlaydi."""
    for v in videos:
        candidates = [f for f in v.get("video_files", []) if f.get("file_type") == "video/mp4"]
        candidates = [f for f in candidates if (f.get("width") or 0) >= min_w]
        if not candidates:
            continue
        # eng past kerakli rezolyutsiyani ol (tez yuklash uchun)
        best = sorted(candidates, key=lambda f: f["width"])[0]
        return best["link"]
    return None


def fetch_video_clip(query: str, out_path: Path, *, orientation: str = "landscape") -> Path | None:
    """Berilgan so'rov bo'yicha stok video yuklaydi. Topilmasa None."""
    out_path.parent.mkdir(parents=True, exist_ok=True)
    params = {"query": query, "per_page": 10, "orientation": orientation}
    r = requests.get(PEXELS_VIDEO_URL, headers=_headers(), params=params, timeout=30)
    r.raise_for_status()
    data = r.json()
    url = _pick_video_file(data.get("videos", []))
    if not url:
        log.warning("Pexels'da video topilmadi: %s", query)
        return None

    log.info("Pexels'dan yuklab olinmoqda: %s", query)
    with requests.get(url, stream=True, timeout=120) as resp:
        resp.raise_for_status()
        with out_path.open("wb") as f:
            for chunk in resp.iter_content(chunk_size=1 << 16):
                f.write(chunk)
    return out_path


def fetch_photo(query: str, out_path: Path, *, orientation: str = "landscape") -> Path | None:
    """Fallback: video topilmasa rasm yuklaydi."""
    out_path.parent.mkdir(parents=True, exist_ok=True)
    params = {"query": query, "per_page": 5, "orientation": orientation}
    r = requests.get(PEXELS_PHOTO_URL, headers=_headers(), params=params, timeout=30)
    r.raise_for_status()
    photos = r.json().get("photos", [])
    if not photos:
        log.warning("Pexels'da rasm ham yo'q: %s", query)
        return None
    url = photos[0]["src"]["large2x"]
    with requests.get(url, stream=True, timeout=60) as resp:
        resp.raise_for_status()
        with out_path.open("wb") as f:
            for chunk in resp.iter_content(chunk_size=1 << 16):
                f.write(chunk)
    return out_path


def fetch_visual(query: str, out_dir: Path, index: int, *, orientation: str = "landscape") -> tuple[Path, str]:
    """Avval video, bo'lmasa rasm. (yo'l, "video"|"image") qaytaradi."""
    video_path = out_dir / f"scene_{index:02d}.mp4"
    if fetch_video_clip(query, video_path, orientation=orientation):
        return video_path, "video"
    photo_path = out_dir / f"scene_{index:02d}.jpg"
    if fetch_photo(query, photo_path, orientation=orientation):
        return photo_path, "image"
    # Yon orientatsiyada ham urinib ko'ramiz
    alt = "portrait" if orientation == "landscape" else "landscape"
    if fetch_video_clip(query, video_path, orientation=alt):
        return video_path, "video"
    if fetch_photo(query, photo_path, orientation=alt):
        return photo_path, "image"
    raise RuntimeError(f"Pexels'da hech narsa topilmadi: {query}")
