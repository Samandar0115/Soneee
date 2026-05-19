"""Bosh dirijyor: queue → trend refill → har mavzu uchun long+short → YouTube'ga upload."""
from __future__ import annotations

import argparse
import datetime as dt
import json
import logging
import shutil
import sys
from pathlib import Path

import yaml
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from agents.script_writer import write_script, write_short_from_long, ScriptPackage  # noqa: E402
from agents.voice_generator import generate_voice  # noqa: E402
from agents.visual_fetcher import fetch_visual  # noqa: E402
from agents.video_assembler import assemble_video  # noqa: E402
from agents.thumbnail_maker import make_thumbnail  # noqa: E402
from agents.youtube_uploader import upload_video  # noqa: E402
from agents.trend_discoverer import refill_queue  # noqa: E402


def _funnel_footer(cfg: dict) -> str:
    """Har video description oxiriga qo'shiladigan funnel matni."""
    f = cfg.get("funnel", {})
    lines: list[str] = ["", "━━━━━━━━━━━━━━━━━━━━"]
    if f.get("channel_subscribe_cta"):
        lines.append(f["channel_subscribe_cta"])
    if f.get("freebie_url"):
        lines.append(f"🎁 {f.get('freebie_label', 'Bepul material')}: {f['freebie_url']}")
    if f.get("course_url"):
        lines.append(f"🎓 To'liq kurs: {f['course_url']}")
    if f.get("telegram_url"):
        lines.append(f"💬 Telegram: {f['telegram_url']}")
    if len(lines) <= 2:
        return ""
    return "\n".join(lines)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger("orchestrator")


def _load_config() -> dict:
    with (ROOT / "config.yaml").open() as f:
        return yaml.safe_load(f)


def _next_topic(queue_path: Path) -> tuple[str | None, list[str]]:
    if not queue_path.exists():
        return None, []
    lines = queue_path.read_text(encoding="utf-8").splitlines()
    chosen: str | None = None
    remaining: list[str] = []
    for line in lines:
        stripped = line.strip()
        if chosen is None and stripped and not stripped.startswith("#"):
            chosen = stripped
        else:
            remaining.append(line)
    return chosen, remaining


def _archive_topic(topic: str, ids: dict[str, str | None], done_path: Path) -> None:
    stamp = dt.datetime.utcnow().isoformat(timespec="seconds")
    parts = " | ".join(f"{k}={v or 'NONE'}" for k, v in ids.items())
    with done_path.open("a", encoding="utf-8") as f:
        f.write(f"{stamp} | {parts} | {topic}\n")


def _render_format(
    pkg: ScriptPackage,
    fmt_cfg: dict,
    work_root: Path,
    cfg: dict,
    fmt_name: str,
) -> tuple[Path, Path | None]:
    """Bitta format uchun video va thumbnail render qiladi."""
    fmt_dir = work_root / fmt_name
    fmt_dir.mkdir(parents=True, exist_ok=True)
    (fmt_dir / "script.json").write_text(
        json.dumps(pkg.to_dict(), ensure_ascii=False, indent=2), encoding="utf-8"
    )

    # Ovoz
    audio_dir = fmt_dir / "audio"
    audio_paths: list[Path] = []
    real_durations: list[float] = []
    for i, scene in enumerate(pkg.scenes):
        out = audio_dir / f"scene_{i:02d}.mp3"
        _, dur = generate_voice(
            scene.narration,
            out,
            voice=cfg["channel"]["default_voice"],
            fallback=cfg["channel"]["fallback_voice"],
        )
        audio_paths.append(out)
        real_durations.append(dur + 0.35)

    # Vizual
    visuals_dir = fmt_dir / "visuals"
    clip_paths: list[Path] = []
    for i, scene in enumerate(pkg.scenes):
        clip, _ = fetch_visual(
            scene.visual_query, visuals_dir, i, orientation=fmt_cfg["orientation"]
        )
        clip_paths.append(clip)

    # Video
    video_path = fmt_dir / "final.mp4"
    assemble_video(
        scene_clips=clip_paths,
        scene_audios=audio_paths,
        scene_durations=real_durations,
        scene_texts=[s.narration for s in pkg.scenes],
        work_dir=fmt_dir / "tmp",
        out_path=video_path,
        width=fmt_cfg["resolution"][0],
        height=fmt_cfg["resolution"][1],
        fps=fmt_cfg["fps"],
        captions=cfg.get("captions", True),
    )

    # Thumbnail (faqat long uchun odatda)
    thumb_path: Path | None = None
    if cfg["thumbnail"].get("enabled", True) and fmt_name == "long":
        thumb_path = fmt_dir / "thumbnail.jpg"
        try:
            make_thumbnail(
                pkg.thumbnail_prompt,
                pkg.title,
                thumb_path,
                width=cfg["thumbnail"]["width"],
                height=cfg["thumbnail"]["height"],
            )
        except Exception as exc:
            log.warning("Thumbnail xato: %s", exc)
            thumb_path = None
    return video_path, thumb_path


def run_topic(topic: str, *, dry_run: bool = False) -> dict[str, str | None]:
    cfg = _load_config()
    work_root = ROOT / "output" / dt.datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    work_root.mkdir(parents=True, exist_ok=True)
    log.info("Ishchi papka: %s", work_root)

    ids: dict[str, str | None] = {}

    # ============ LONG ============
    long_id: str | None = None
    if cfg["formats"]["long"]["enabled"]:
        log.info("=== LONG-FORM ===")
        long_pkg = write_script(
            topic,
            language=cfg["channel"]["language"],
            style=cfg["script"]["style"],
            duration_sec=cfg["formats"]["long"]["target_duration_sec"],
            scenes=cfg["formats"]["long"]["scenes"],
            hook_seconds=cfg["script"]["hook_seconds"],
            model_name=cfg["script"]["model"],
        )
        long_video, long_thumb = _render_format(
            long_pkg, cfg["formats"]["long"], work_root, cfg, "long"
        )
        if not dry_run:
            long_desc = (
                long_pkg.description
                + "\n\n#" + " #".join(long_pkg.tags[:8])
                + _funnel_footer(cfg)
            )
            long_id = upload_video(
                long_video,
                long_thumb,
                title=long_pkg.title,
                description=long_desc,
                tags=long_pkg.tags,
                privacy_status=cfg["channel"]["privacy_status"],
            )
        ids["long"] = long_id
    else:
        long_pkg = None  # type: ignore[assignment]

    # ============ SHORT ============
    if cfg["formats"]["short"]["enabled"]:
        log.info("=== SHORTS ===")
        if long_pkg is None:
            # Long o'chirilgan bo'lsa, shortni mustaqil yozamiz
            short_pkg = write_script(
                topic,
                language=cfg["channel"]["language"],
                style=cfg["script"]["style"],
                duration_sec=cfg["formats"]["short"]["target_duration_sec"],
                scenes=cfg["formats"]["short"]["scenes"],
                hook_seconds=2,
                model_name=cfg["script"]["model"],
            )
        else:
            short_pkg = write_short_from_long(
                topic,
                long_pkg,
                scenes=cfg["formats"]["short"]["scenes"],
                duration_sec=cfg["formats"]["short"]["target_duration_sec"],
                model_name=cfg["script"]["model"],
            )
        short_video, _ = _render_format(
            short_pkg, cfg["formats"]["short"], work_root, cfg, "short"
        )
        if not dry_run:
            short_desc = short_pkg.description
            if cfg["formats"]["short"].get("cta_long_link") and long_id:
                short_desc += f"\n\nTo'liq video: https://youtu.be/{long_id}"
            short_desc += "\n\n#shorts #" + " #".join(t for t in short_pkg.tags[:8] if t.lower() != "shorts")
            short_desc += _funnel_footer(cfg)
            short_id = upload_video(
                short_video,
                None,
                title=short_pkg.title,
                description=short_desc,
                tags=short_pkg.tags + ["shorts"],
                privacy_status=cfg["channel"]["privacy_status"],
            )
            ids["short"] = short_id
        else:
            ids["short"] = None

    return ids


def main() -> int:
    load_dotenv(ROOT / ".env")
    parser = argparse.ArgumentParser()
    parser.add_argument("--topic", help="Aniq mavzu (queue'dan o'tib ketadi)")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--keep-output", action="store_true")
    parser.add_argument("--refill-only", action="store_true", help="Faqat queue'ni trend bilan to'ldir, video chiqarma")
    args = parser.parse_args()

    cfg = _load_config()
    queue_path = ROOT / "topics" / "queue.txt"
    done_path = ROOT / "topics" / "done.txt"

    # 1. Trend agent — queue past bo'lsa to'ldir
    if cfg["trend_discoverer"]["enabled"]:
        try:
            refill_queue(
                queue_path,
                cfg["niches"],
                below=cfg["trend_discoverer"]["refill_when_below"],
                count=cfg["trend_discoverer"]["fetch_count"],
                model_name=cfg["trend_discoverer"]["model"],
            )
        except Exception:
            log.exception("Trend agent xato berdi — davom etamiz")

    if args.refill_only:
        return 0

    # 2. Mavzu tanlash
    if args.topic:
        topic = args.topic
        remaining: list[str] | None = None
    else:
        topic, remaining = _next_topic(queue_path)
        if not topic:
            log.info("Queue bo'sh va trend agent yordam bermadi. Chiqyapman.")
            return 0

    log.info("MAVZU: %s", topic)
    try:
        ids = run_topic(topic, dry_run=args.dry_run)
    except Exception:
        log.exception("Pipeline xato berdi")
        return 1

    if not args.dry_run and remaining is not None:
        queue_path.write_text("\n".join(remaining) + ("\n" if remaining else ""), encoding="utf-8")
        _archive_topic(topic, ids, done_path)

    if not args.keep_output:
        out_dir = ROOT / "output"
        if out_dir.exists():
            for sub in out_dir.iterdir():
                if sub.is_dir():
                    shutil.rmtree(sub, ignore_errors=True)

    log.info("TAMOM. Yuklangan: %s", ids)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
