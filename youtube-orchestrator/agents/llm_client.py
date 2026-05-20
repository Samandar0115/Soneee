"""Universal LLM client — Gemini bor bo'lsa Gemini, bo'lmasa Pollinations.ai (bepul, kalitsiz).

Pollinations text API:
- POST https://text.pollinations.ai/openai (OpenAI-compatible)
- Modellar: openai, mistral, llama va h.k.
- Cheksiz bepul, kalitsiz.
"""
from __future__ import annotations

import json
import logging
import os
import re
import time

import requests

log = logging.getLogger(__name__)

POLLINATIONS_TEXT_URL = "https://text.pollinations.ai/openai"


def _has_gemini() -> bool:
    return bool(os.environ.get("GEMINI_API_KEY"))


def _gemini_complete(prompt: str, model: str) -> str:
    try:
        import google.generativeai as genai
    except ImportError as exc:
        raise RuntimeError("google-generativeai o'rnatilmagan") from exc
    genai.configure(api_key=os.environ["GEMINI_API_KEY"])
    m = genai.GenerativeModel(model)
    return m.generate_content(prompt).text


def _pollinations_complete(prompt: str, model: str = "openai", retries: int = 3) -> str:
    """OpenAI-mos JSON javob beradigan endpoint."""
    body = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "private": True,
        "seed": int(time.time()),
    }
    last_err: Exception | None = None
    for attempt in range(retries):
        try:
            r = requests.post(POLLINATIONS_TEXT_URL, json=body, timeout=120)
            r.raise_for_status()
            data = r.json()
            # OpenAI-style: choices[0].message.content
            if isinstance(data, dict) and "choices" in data:
                return data["choices"][0]["message"]["content"]
            # Ba'zi javoblar oddiy matn bo'ladi
            return r.text
        except Exception as exc:
            last_err = exc
            log.warning("Pollinations urinish #%d xato: %s", attempt + 1, exc)
            time.sleep(2 ** attempt)
    raise RuntimeError(f"Pollinations 3 marta xato berdi: {last_err}")


def complete(prompt: str, *, prefer_gemini: bool = True, gemini_model: str = "gemini-2.0-flash",
             pollinations_model: str = "openai") -> str:
    """Asosiy giriş nuqtasi. Gemini bo'lsa undan, bo'lmasa Pollinations'dan."""
    if prefer_gemini and _has_gemini():
        try:
            return _gemini_complete(prompt, gemini_model)
        except Exception as exc:
            log.warning("Gemini xato berdi (%s), Pollinations'ga o'tilmoqda", exc)
    return _pollinations_complete(prompt, pollinations_model)


def extract_json(text: str) -> dict:
    """LLM javobidan JSON ajratib oladi (markdown bloklar ichida ham)."""
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?", "", text).strip().rstrip("`").strip()
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise ValueError(f"JSON topilmadi:\n{text[:500]}")
    return json.loads(match.group(0))
