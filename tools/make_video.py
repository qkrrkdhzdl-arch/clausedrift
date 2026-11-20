#!/usr/bin/env python3
"""Build the demo video from the live app's own screenshots.

    python3 tools/make_video.py

Each scene is one narrated line: the voice is synthesised first, its length
sets how long the scene holds, and a caption bar is burned in under the shot.
The shots are captures of the running app (docs/shots), not mockups — the
numbers on screen are the ones the code computed.

Output: tools/out/clause-drift-demo.mp4 (1280x720, H.264 + AAC).
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SHOTS = ROOT / "docs" / "shots"
AUDIO = ROOT / "tools" / "audio"
OUT = ROOT / "tools" / "out"
GTTS = "/workspace/.local/bin/gtts-cli"

W, H = 1280, 720
PAPER = (247, 244, 238)
INK = (27, 26, 23)
RED = (163, 50, 35)
SOFT = (86, 81, 74)

FONT_REG = "/usr/share/fonts/pickle-hwp/NotoSansCJKkr-Regular.otf"
FONT_SERIF = "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf"

import imageio_ffmpeg  # noqa: E402

FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()


def font(size, serif=False, korean=False):
    for path in ([FONT_SERIF] if serif else []) + [FONT_REG,
              "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"]:
        try:
            if korean and path == FONT_SERIF:
                continue
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def title_card(caption: str) -> Image.Image:
    img = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W, 6], fill=RED)
    d.text((90, 210), "Clause", font=font(96, serif=True), fill=INK)
    d.text((90 + 300, 210), "Drift", font=font(96, serif=True), fill=RED)
    d.text((96, 340), "You were sent a revised contract.", font=font(34), fill=SOFT)
    d.text((96, 388), "Here is what changed, and what it costs.", font=font(34), fill=SOFT)
    if caption:
        d.text((96, 520), caption, font=font(22), fill=SOFT)
    d.line([96, 480, 560, 480], fill=(200, 192, 180), width=1)
    return img


def caption_bar(img: Image.Image, caption: str) -> Image.Image:
    if not caption:
        return img
    bar_h = 74
    canvas = Image.new("RGB", (W, H + bar_h), PAPER)
    canvas.paste(img, (0, 0))
    d = ImageDraw.Draw(canvas)
    d.rectangle([0, H, W, H + bar_h], fill=(27, 26, 23))
    f = font(26)
    tw = d.textlength(caption, font=f)
    d.text(((W - tw) / 2, H + 22), caption, font=f, fill=(247, 244, 238))
    return canvas


def fit(img: Image.Image) -> Image.Image:
    """Letterbox a screenshot into a 1280x720 frame on paper."""
    img = img.convert("RGB")
    scale = min(W / img.width, H / img.height)
    resized = img.resize((int(img.width * scale), int(img.height * scale)), Image.LANCZOS)
    canvas = Image.new("RGB", (W, H), PAPER)
    canvas.paste(resized, ((W - resized.width) // 2, (H - resized.height) // 2))
    return canvas


def audio_for(scene) -> Path:
    path = AUDIO / f"{scene['id']}.mp3"
    if not path.exists():
        subprocess.run([GTTS, "-l", "en", "-o", str(path), scene["say"]], check=True)
    return path


def duration_of(path: Path) -> float:
    out = subprocess.run(
        [FFMPEG, "-i", str(path), "-f", "null", "-"],
        capture_output=True, text=True,
    ).stderr
    for line in out.splitlines():
        if "time=" in line:
            stamp = line.split("time=")[1].split()[0]
            h, m, s = stamp.split(":")
            return int(h) * 3600 + int(m) * 60 + float(s)
    raise RuntimeError(f"no duration for {path}")


def build_scene(scene, image_path: Path, seconds: float, audio: Path, index: int) -> Path:
    out = OUT / f"scene{index:02d}.mp4"
    # Slow zoom keeps a still screenshot alive without pretending it is video.
    zoom = (
        "scale=1600:-1,"
        "zoompan=z='min(zoom+0.0006,1.08)':d={frames}:"
        "x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={w}x{h}:fps=30"
    ).format(frames=int(seconds * 30), w=W, h=H)
    subprocess.run([
        FFMPEG, "-y", "-loop", "1", "-i", str(image_path), "-i", str(audio),
        "-filter_complex",
        f"[0:v]{zoom},format=yuv420p,fade=t=in:st=0:d=0.5,"
        f"fade=t=out:st={max(0, seconds - 0.6):.2f}:d=0.6[v]",
        "-map", "[v]", "-map", "1:a",
        "-t", f"{seconds:.2f}", "-r", "30",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
        "-c:a", "aac", "-b:a", "160k", "-ar", "44100",
        str(out),
    ], check=True, capture_output=True)
    return out


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    AUDIO.mkdir(parents=True, exist_ok=True)
    HIDE = {"01-title", "10-close"}
    HIDE_2 = {"01-title", "10-close"}
    data = json.loads((ROOT / "tools" / "narration.json").read_text())
    segments = []
    total = 0.0
    for i, scene in enumerate(data["scenes"], start=1):
        audio = audio_for(scene)
        speech = duration_of(audio)
        hold = speech + (2.2 if scene["id"] in HIDE else 1.0)
        if scene["shot"] == "title":
            img = title_card(scene.get("caption", ""))
        else:
            src = ROOT / "docs" / scene["shot"]
            if not src.exists():
                print(f"missing shot {src}", file=sys.stderr)
                return 1
            img = fit(Image.open(src))
            img = caption_bar(img, scene.get("caption", ""))
        frame = OUT / f"frame{i:02d}.png"
        img.save(frame)
        seg = build_scene(scene, frame, hold, audio, i)
        segments.append(seg)
        total += hold
        print(f"{scene['id']:<12} {hold:5.1f}s  {seg.name}")

    listing = OUT / "list.txt"
    listing.write_text("".join(f"file '{s.name}'\n" for s in segments))
    final = OUT / "clause-drift-demo.mp4"
    subprocess.run([
        FFMPEG, "-y", "-f", "concat", "-safe", "0", "-i", str(listing),
        "-c", "copy", str(final),
    ], check=True, capture_output=True)
    print(f"\n{final}  ·  {total:.1f}s total")
    return 0


if __name__ == "__main__":
    sys.exit(main())
