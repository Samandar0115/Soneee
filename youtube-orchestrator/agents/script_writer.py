"""Skript yozuvchi agent — Gemini API orqali strukturalangan skript ishlab chiqaradi."""
from __future__ import annotations

import json
import logging
import os
import re
from dataclasses import dataclass, asdict

import google.generativeai as genai

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
3. Har sahna uchun ingliz tilida 2-4 so'zli `visual_query` ber (Pexels'da qidirish uchun).
4. So'nggi sahna — CTA (like/subscribe/comment).
5. Title 60 belgidan oshmasin, click-worthy bo'lsin.
6. Description 200-400 belgi, kalit so'zlar bilan.
7. 8-12 ta tag.
8. Thumbnail prompt — ingliz tilida, vizual, dramatik (Pollinations'ga uzatiladi).

FAQAT JSON qaytar, boshqa matn yo'q. Format:
{{
  "title": "...",
  "description": "...",
  "tags": ["...", "..."],
  "thumbnail_prompt": "cinematic, bold, ...",
  "scenes": [
    {{"narration": "...", "visual_query": "...", "duration_sec": 12}},
    ...
  ]
}}
"""


def _extract_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?", "", text).rstrip("`").strip()
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise ValueError(f"JSON topilmadi:\n{text[:500]}")
    return json.loads(match.group(0))


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
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY .env yoki secrets'da yo'q")
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(model_name)

    prompt = PROMPT_TEMPLATE.format(
        topic=topic,
        language=language,
        style=style,
        duration=duration_sec,
        scenes=scenes,
        hook=hook_seconds,
        per_scene=max(5, duration_sec // scenes),
    )

    log.info("Skript so'ralmoqda: %s", topic)
    response = model.generate_content(prompt)
    data = _extract_json(response.text)

    pkg = ScriptPackage(
        title=data["title"].strip(),
        description=data["description"].strip(),
        tags=[t.strip() for t in data["tags"]],
        thumbnail_prompt=data["thumbnail_prompt"].strip(),
        scenes=[
            Scene(
                narration=s["narration"].strip(),
                visual_query=s["visual_query"].strip(),
                duration_sec=float(s.get("duration_sec", duration_sec / scenes)),
            )
            for s in data["scenes"]
        ],
    )
    log.info("Skript tayyor: %s (%d sahna)", pkg.title, len(pkg.scenes))
    return pkg
