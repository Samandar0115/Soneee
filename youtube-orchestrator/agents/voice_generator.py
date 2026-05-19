"""Ovoz generatori — edge-tts (Microsoft Edge'ning TTS xizmati, bepul, kalitsiz)."""
from __future__ import annotations

import asyncio
import logging
import subprocess
from pathlib import Path

import edge_tts

log = logging.getLogger(__name__)

# O'zbek tilida hozircha edge-tts'da rasmiy ovoz cheklangan.
# Madina va Sardor ovozlari mavjud (uz-UZ).
DEFAULT_UZ_VOICE = "uz-UZ-MadinaNeural"
FALLBACK_VOICE = "en-US-AriaNeural"


async def _synthesize(text: str, voice: str, out_path: Path) -> None:
    communicate = edge_tts.Communicate(text=text, voice=voice, rate="+0%")
    await communicate.save(str(out_path))


def _probe_duration(path: Path) -> float:
    """ffprobe orqali audio davomiyligini soniyada qaytaradi."""
    result = subprocess.run(
        [
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1", str(path),
        ],
        capture_output=True, text=True, check=True,
    )
    return float(result.stdout.strip())


def generate_voice(
    text: str,
    out_path: Path,
    *,
    voice: str = DEFAULT_UZ_VOICE,
    fallback: str = FALLBACK_VOICE,
) -> tuple[Path, float]:
    """Matnni MP3'ga o'giradi. (yo'l, davomiylik) qaytaradi."""
    out_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        asyncio.run(_synthesize(text, voice, out_path))
    except Exception as exc:
        log.warning("Asosiy ovoz (%s) xato berdi: %s — fallback'ga o'tilmoqda", voice, exc)
        asyncio.run(_synthesize(text, fallback, out_path))
    duration = _probe_duration(out_path)
    log.info("Ovoz tayyor: %s (%.2fs)", out_path.name, duration)
    return out_path, duration
