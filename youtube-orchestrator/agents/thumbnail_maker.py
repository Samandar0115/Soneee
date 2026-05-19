"""Thumbnail generatori — Pollinations.ai (bepul, kalitsiz)."""
from __future__ import annotations

import logging
import urllib.parse
from pathlib import Path

import requests
from PIL import Image, ImageDraw, ImageFont

log = logging.getLogger(__name__)

POLLINATIONS_URL = "https://image.pollinations.ai/prompt/{prompt}"


def _generate_base(prompt: str, out: Path, width: int, height: int) -> Path:
    encoded = urllib.parse.quote(prompt)
    url = POLLINATIONS_URL.format(prompt=encoded) + f"?width={width}&height={height}&nologo=true&model=flux"
    log.info("Thumbnail so'ralmoqda: %s", prompt[:80])
    resp = requests.get(url, timeout=120)
    resp.raise_for_status()
    out.write_bytes(resp.content)
    return out


def _overlay_title(image_path: Path, title: str, out: Path) -> Path:
    img = Image.open(image_path).convert("RGB")
    draw = ImageDraw.Draw(img)
    w, h = img.size

    # Font tanlash (Linux/Mac/Windows uchun standart)
    font = None
    for candidate in [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/Library/Fonts/Arial Bold.ttf",
        "C:\\Windows\\Fonts\\arialbd.ttf",
    ]:
        try:
            font = ImageFont.truetype(candidate, size=int(h * 0.09))
            break
        except OSError:
            continue
    if font is None:
        font = ImageFont.load_default()

    # Matnni 2-3 qatorga bo'lish
    words = title.split()
    lines, cur = [], ""
    for w_ in words:
        test = (cur + " " + w_).strip()
        if draw.textlength(test, font=font) > w * 0.9 and cur:
            lines.append(cur)
            cur = w_
        else:
            cur = test
    if cur:
        lines.append(cur)

    # Yarim shaffof yorqin fon
    total_h = sum(font.size + 10 for _ in lines)
    y = h - total_h - 40
    box_top = y - 20
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    odraw = ImageDraw.Draw(overlay)
    odraw.rectangle([(0, box_top), (w, h)], fill=(0, 0, 0, 160))
    img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
    draw = ImageDraw.Draw(img)

    for line in lines:
        tw = draw.textlength(line, font=font)
        x = (w - tw) / 2
        # Outline
        for dx, dy in [(-2, 0), (2, 0), (0, -2), (0, 2)]:
            draw.text((x + dx, y + dy), line, font=font, fill="black")
        draw.text((x, y), line, font=font, fill="yellow")
        y += font.size + 10

    img.save(out, "JPEG", quality=90)
    return out


def make_thumbnail(prompt: str, title: str, out_path: Path, *, width: int = 1280, height: int = 720) -> Path:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    base = out_path.parent / "thumb_base.jpg"
    _generate_base(prompt, base, width, height)
    _overlay_title(base, title, out_path)
    log.info("Thumbnail tayyor: %s", out_path)
    return out_path
