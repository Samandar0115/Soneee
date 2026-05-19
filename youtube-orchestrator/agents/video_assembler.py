"""Video yig'uvchi — FFmpeg orqali sahnalarni audio bilan birlashtiradi."""
from __future__ import annotations

import logging
import shutil
import subprocess
from pathlib import Path

log = logging.getLogger(__name__)


def _run(cmd: list[str]) -> None:
    log.debug("$ %s", " ".join(cmd))
    subprocess.run(cmd, check=True, capture_output=True)


def _ensure_ffmpeg() -> None:
    if shutil.which("ffmpeg") is None:
        raise RuntimeError("ffmpeg topilmadi. `apt-get install ffmpeg` yoki brew install ffmpeg.")


def _normalize_clip(src: Path, dst: Path, duration: float, width: int, height: int, fps: int) -> None:
    """Klipni belgilangan o'lcham/fps/davomiylikga keltiradi. Rasmni videoga aylantiradi."""
    is_image = src.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}
    vf = (
        f"scale={width}:{height}:force_original_aspect_ratio=increase,"
        f"crop={width}:{height},setsar=1,fps={fps}"
    )
    if is_image:
        cmd = [
            "ffmpeg", "-y", "-loop", "1", "-i", str(src),
            "-t", f"{duration:.3f}", "-vf", vf,
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "veryfast",
            "-an", str(dst),
        ]
    else:
        # video: kerakli davomiylikga kesish yoki cho'zish (loop). Avval davomiylikni tekshirmasdan
        # `stream_loop` ishlatamiz — qisqa video bo'lsa qaytarib o'ynaydi.
        cmd = [
            "ffmpeg", "-y", "-stream_loop", "-1", "-i", str(src),
            "-t", f"{duration:.3f}", "-vf", vf,
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "veryfast",
            "-an", str(dst),
        ]
    _run(cmd)


def _concat_videos(clips: list[Path], out: Path, list_file: Path) -> None:
    list_file.write_text("\n".join(f"file '{c.as_posix()}'" for c in clips), encoding="utf-8")
    _run([
        "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(list_file),
        "-c", "copy", str(out),
    ])


def _concat_audio(audios: list[Path], out: Path, list_file: Path) -> None:
    list_file.write_text("\n".join(f"file '{a.as_posix()}'" for a in audios), encoding="utf-8")
    _run([
        "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(list_file),
        "-c:a", "libmp3lame", "-b:a", "192k", str(out),
    ])


def _mux(video: Path, audio: Path, out: Path) -> None:
    _run([
        "ffmpeg", "-y", "-i", str(video), "-i", str(audio),
        "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
        "-shortest", str(out),
    ])


def _burn_captions(video: Path, srt: Path, out: Path) -> None:
    # SRT'ni FFmpeg subtitles filter orqali yondiramiz
    vf = f"subtitles='{srt.as_posix()}':force_style='FontName=DejaVu Sans,Fontsize=20,Outline=2,BorderStyle=1'"
    _run([
        "ffmpeg", "-y", "-i", str(video), "-vf", vf,
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "veryfast",
        "-c:a", "copy", str(out),
    ])


def _write_srt(scene_texts: list[str], scene_durations: list[float], out: Path) -> None:
    def fmt(t: float) -> str:
        h, rem = divmod(t, 3600)
        m, s = divmod(rem, 60)
        ms = int((s - int(s)) * 1000)
        return f"{int(h):02d}:{int(m):02d}:{int(s):02d},{ms:03d}"

    lines: list[str] = []
    cursor = 0.0
    for i, (text, dur) in enumerate(zip(scene_texts, scene_durations), start=1):
        start, end = cursor, cursor + dur
        lines.append(f"{i}\n{fmt(start)} --> {fmt(end)}\n{text}\n")
        cursor = end
    out.write_text("\n".join(lines), encoding="utf-8")


def assemble_video(
    scene_clips: list[Path],
    scene_audios: list[Path],
    scene_durations: list[float],
    scene_texts: list[str],
    work_dir: Path,
    out_path: Path,
    *,
    width: int = 1920,
    height: int = 1080,
    fps: int = 30,
    captions: bool = True,
) -> Path:
    _ensure_ffmpeg()
    work_dir.mkdir(parents=True, exist_ok=True)

    log.info("Sahnalar normalizatsiya qilinmoqda")
    norm_clips: list[Path] = []
    for i, (clip, dur) in enumerate(zip(scene_clips, scene_durations)):
        norm = work_dir / f"norm_{i:02d}.mp4"
        _normalize_clip(clip, norm, dur, width, height, fps)
        norm_clips.append(norm)

    log.info("Video birlashtirilmoqda")
    silent_video = work_dir / "silent.mp4"
    _concat_videos(norm_clips, silent_video, work_dir / "vlist.txt")

    log.info("Audio birlashtirilmoqda")
    full_audio = work_dir / "full.mp3"
    _concat_audio(scene_audios, full_audio, work_dir / "alist.txt")

    log.info("Audio + video mux qilinmoqda")
    pre_caption = work_dir / "muxed.mp4"
    _mux(silent_video, full_audio, pre_caption)

    if captions:
        log.info("Subtitr yondirilmoqda")
        srt = work_dir / "captions.srt"
        _write_srt(scene_texts, scene_durations, srt)
        _burn_captions(pre_caption, srt, out_path)
    else:
        shutil.copy(pre_caption, out_path)

    log.info("Video tayyor: %s", out_path)
    return out_path
