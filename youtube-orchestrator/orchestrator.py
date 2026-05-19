"""Bosh dirijyor: mavzu → skript → ovoz → vizual → video → thumbnail → YouTube → done."""
from __future__ import annotations

import argparse
import datetime as dt
import logging
import shutil
import sys
from pathlib import Path

import yaml
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from agents.script_writer import write_script  # noqa: E402
from agents.voice_generator import generate_voice  # noqa: E402
from agents.visual_fetcher import fetch_visual  # noqa: E402
from agents.video_assembler import assemble_video  # noqa: E402
from agents.thumbnail_maker import make_thumbnail  # noqa: E402
from agents.youtube_uploader import upload_video  # noqa: E402

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger("orchestrator")


def _load_config() -> dict:
    with (ROOT / "config.yaml").open() as f:
        return yaml.safe_load(f)


def _next_topic(queue_path: Path) -> tuple[str | None, list[str]]:
    """Birinchi izohsiz qatorni ol, qolgan navbatni qaytar."""
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


def _archive_topic(topic: str, video_id: str | None, done_path: Path) -> None:
    stamp = dt.datetime.utcnow().isoformat(timespec="seconds")
    entry = f"{stamp} | {video_id or 'DRY-RUN'} | {topic}\n"
    with done_path.open("a", encoding="utf-8") as f:
        f.write(entry)


def run_pipeline(topic: str, *, dry_run: bool = False) -> str | None:
    cfg = _load_config()
    work_root = ROOT / "output" / dt.datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    work_root.mkdir(parents=True, exist_ok=True)
    log.info("Ishchi papka: %s", work_root)

    # 1. Skript
    pkg = write_script(
        topic,
        language=cfg["channel"]["language"],
        style=cfg["script"]["style"],
        duration_sec=cfg["video"]["target_duration_sec"],
        scenes=cfg["video"]["scenes"],
        hook_seconds=cfg["script"]["hook_seconds"],
        model_name=cfg["script"]["model"],
    )
    (work_root / "script.json").write_text(
        __import__("json").dumps(pkg.to_dict(), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    # 2. Ovoz (har sahna alohida)
    audio_dir = work_root / "audio"
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
        # Haqiqiy davomiylik nutqdan kelib chiqadi (+ 0.4s pauza)
        real_durations.append(dur + 0.4)

    # 3. Vizual
    visuals_dir = work_root / "visuals"
    clip_paths: list[Path] = []
    for i, scene in enumerate(pkg.scenes):
        clip, _ = fetch_visual(scene.visual_query, visuals_dir, i)
        clip_paths.append(clip)

    # 4. Video yig'ish
    video_path = work_root / "final.mp4"
    assemble_video(
        scene_clips=clip_paths,
        scene_audios=audio_paths,
        scene_durations=real_durations,
        scene_texts=[s.narration for s in pkg.scenes],
        work_dir=work_root / "tmp",
        out_path=video_path,
        width=cfg["video"]["resolution"][0],
        height=cfg["video"]["resolution"][1],
        fps=cfg["video"]["fps"],
        captions=cfg["video"]["captions"],
    )

    # 5. Thumbnail
    thumb_path = work_root / "thumbnail.jpg"
    try:
        make_thumbnail(
            pkg.thumbnail_prompt,
            pkg.title,
            thumb_path,
            width=cfg["thumbnail"]["width"],
            height=cfg["thumbnail"]["height"],
        )
    except Exception as exc:
        log.warning("Thumbnail yaratilmadi: %s", exc)
        thumb_path = None  # type: ignore[assignment]

    # 6. Upload
    if dry_run:
        log.info("DRY-RUN — YouTube'ga yuklanmadi. Video: %s", video_path)
        return None

    video_id = upload_video(
        video_path,
        thumb_path,
        title=pkg.title,
        description=pkg.description + "\n\n#" + " #".join(pkg.tags[:8]),
        tags=pkg.tags,
        privacy_status=cfg["channel"]["privacy_status"],
    )
    return video_id


def main() -> int:
    load_dotenv(ROOT / ".env")
    parser = argparse.ArgumentParser()
    parser.add_argument("--topic", help="Aniq mavzu (queue'dan o'tib ketadi)")
    parser.add_argument("--dry-run", action="store_true", help="YouTube'ga yuklamasdan test")
    parser.add_argument("--keep-output", action="store_true", help="Ishchi fayllarni o'chirma")
    args = parser.parse_args()

    queue_path = ROOT / "topics" / "queue.txt"
    done_path = ROOT / "topics" / "done.txt"

    if args.topic:
        topic = args.topic
        remaining: list[str] | None = None
    else:
        topic, remaining = _next_topic(queue_path)
        if not topic:
            log.info("Navbatda mavzu yo'q. Chiqyapman.")
            return 0

    log.info("MAVZU: %s", topic)
    try:
        video_id = run_pipeline(topic, dry_run=args.dry_run)
    except Exception:
        log.exception("Pipeline xato berdi")
        return 1

    if not args.dry_run and remaining is not None:
        queue_path.write_text("\n".join(remaining) + ("\n" if remaining else ""), encoding="utf-8")
        _archive_topic(topic, video_id, done_path)

    if not args.keep_output:
        # Faqat asosiy video va thumbnail'ni saqla, qolganini o'chir
        for sub in (ROOT / "output").iterdir():
            if sub.is_dir() and sub.name != ".gitkeep":
                # Hech narsa saqlamaymiz — YouTube'da turibdi
                shutil.rmtree(sub, ignore_errors=True)

    log.info("TAMOM")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
