"""Skript yozuvchi agent — universal LLM client orqali skript ishlab chiqaradi."""
from __future__ import annotations

import logging
from dataclasses import dataclass, asdict

from .llm_client import complete, extract_json

log = logging.getLogger(__name__)


@dataclass
class Scene:
    narration: str
    visual_query: str
    duration_sec: float


@dataclass
class ScriptPackage:
    title: str
    description: str
    tags: list[str]
    thumbnail_prompt: str
    scenes: list[Scene]

    def to_dict(self) -> dict:
        return {
            "title": self.title,
            "description": self.description,
            "tags": self.tags,
            "thumbnail_prompt": self.thumbnail_prompt,
            "scenes": [asdict(s) for s in self.scenes],
        }


PROMPT_TEMPLATE = """Sen YouTube uchun virusli, qiziqarli kontent yozadigan stsenariychisan.

MAVZU: {topic}
TIL: {language}
USLUB: {style}
UMUMIY DAVOMIYLIK: ~{duration} soniya
SAHNALAR SONI: {scenes}

Quyidagi qoidalarga qat'iy amal qil:
1. Birinchi {hook} soniyada kuchli hook (savol, statistika, qarama-qarshilik) bo'lsin.
2. Har bir sahna: 1-3 ta jumla, ovoz chiqarib o'qiganda ~{per_scene} soniya.
3. Har sahna uchun ingliz tilida 2-4 so'zli `visual_query` ber (rasm/video qidirish uchun).
4. So'nggi sahna — CTA (like/subscribe/comment).
5. Title 60 belgidan oshmasin, click-worthy bo'lsin.
6. Description 200-400 belgi, kalit so'zlar bilan.
7. 8-12 ta tag.
8. Thumbnail prompt — ingliz tilida, vizual, dramatik (rasm generatsiya uchun).

FAQAT JSON qaytar, boshqa matn yo'q. Format:
{{
  "title": "...",
  "description": "...",
  "tags": ["...", "..."],
  "thumbnail_prompt": "cinematic, bold, ...",
  "scenes": [
    {{"narration": "...", "visual_query": "...", "duration_sec": 12}}
  ]
}}
"""

SHORT_PROMPT = """Sen ushbu uzunroq video uchun YouTube SHORTS (vertikal, 50-60 soniya) variantini yozasan.

ASOSIY VIDEO MAVZUSI: {topic}
ASOSIY VIDEO TITLE: {long_title}
ASOSIY VIDEO QISQA: {long_desc}

Talab:
- 3-4 sahna, jami ~55 soniya.
- Birinchi 2 soniyada portlovchi hook.
- Asosiy fikrning eng "wow" qismini ber.
- Oxirgi sahna: "To'liq video kanalda" CTA.
- Tag'lar #shorts ni o'z ichiga olsin.

FAQAT JSON qaytar:
{{
  "title": "kuchli, qisqa, ~50 belgi",
  "description": "shorts uchun qisqa, hashtag bilan",
  "tags": ["...", "shorts"],
  "thumbnail_prompt": "vertical, bold...",
  "scenes": [
    {{"narration": "...", "visual_query": "...", "duration_sec": 12}}
  ]
}}
"""


def _pkg_from_data(data: dict, default_dur: float, max_scenes: int | None = None) -> ScriptPackage:
    scenes_raw = data["scenes"]
    if max_scenes:
        scenes_raw = scenes_raw[:max_scenes]
    return ScriptPackage(
        title=data["title"].strip(),
        description=data["description"].strip(),
        tags=[t.strip() for t in data["tags"]],
        thumbnail_prompt=data["thumbnail_prompt"].strip(),
        scenes=[
            Scene(
                narration=s["narration"].strip(),
                visual_query=s["visual_query"].strip(),
                duration_sec=float(s.get("duration_sec", default_dur)),
            )
            for s in scenes_raw
        ],
    )


def write_script(
    topic: str,
    *,
    language: str = "uz",
    style: str = "qiziqarli, ta'limiy",
    duration_sec: int = 90,
    scenes: int = 6,
    hook_seconds: int = 5,
    model_name: str = "gemini-2.0-flash",
) -> ScriptPackage:
    prompt = PROMPT_TEMPLATE.format(
        topic=topic, language=language, style=style, duration=duration_sec,
        scenes=scenes, hook=hook_seconds, per_scene=max(5, duration_sec // scenes),
    )
    log.info("Skript so'ralmoqda: %s", topic)
    raw = complete(prompt, gemini_model=model_name)
    data = extract_json(raw)
    pkg = _pkg_from_data(data, duration_sec / max(1, scenes))
    log.info("Skript tayyor: %s (%d sahna)", pkg.title, len(pkg.scenes))
    return pkg


def write_short_from_long(
    topic: str,
    long_pkg: ScriptPackage,
    *,
    scenes: int = 4,
    duration_sec: int = 55,
    model_name: str = "gemini-2.0-flash",
) -> ScriptPackage:
    prompt = SHORT_PROMPT.format(
        topic=topic, long_title=long_pkg.title, long_desc=long_pkg.description[:300],
    )
    raw = complete(prompt, gemini_model=model_name)
    data = extract_json(raw)
    pkg = _pkg_from_data(data, duration_sec / max(1, scenes), max_scenes=scenes)
    log.info("Short skript tayyor: %s", pkg.title)
    return pkg
