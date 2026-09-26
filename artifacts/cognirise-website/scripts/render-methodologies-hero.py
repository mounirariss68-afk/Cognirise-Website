"""Render a one-minute, forward-only Pulse signal film over the approved route artwork.

Requires Pillow and FFmpeg. The architecture is a single original still extracted
from this route's source film; the animated tracers are calculated for every frame,
not reversed or assembled from a repeated short video passage.
"""

from __future__ import annotations

import math
import subprocess
from pathlib import Path
from tempfile import TemporaryDirectory

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / "attached_assets/generated_videos/methodologies-pulse-hero-source.mp4"
VIDEO_DIR = ROOT / "artifacts/cognirise-website/public/videos/cognirise"
IMAGE_DIR = ROOT / "artifacts/cognirise-website/public/images/cognirise"
STEM = "methodologies-pulse-hero-forward"
FPS = 24
DURATION = 60
WIDTH, HEIGHT = 960, 540
TAU = 2 * math.pi

# Start at the side passages and travel down into the central corridor.
# Every signal moves in one direction. Distinct whole-minute lap counts make
# the combined choreography meet its initial state only at the film boundary.
PATHS = []
for i in range(9):
    shift = (i - 4) * 0.009
    PATHS.append((
        (.308, .34 + shift * 1.7),
        (.58, .46 + shift),
        (.54, .74 + shift),
        (.49 + shift * .36, 1.11),
        (164, 123, 235) if i % 3 == 0 else (222, 98, 166) if i % 3 == 1 else (250, 164, 126),
        (1, 2, 3, 4, 5, 7, 8, 9, 11)[i],
        (i * .137) % 1,
    ))
for i in range(9):
    shift = (i - 4) * 0.009
    PATHS.append((
        (.677, .30 + shift * 1.9),
        (.66, .48 + shift),
        (.50, .70 + shift),
        (.50 + shift * .45, 1.11),
        (133, 100, 228) if i % 3 == 0 else (220, 82, 164) if i % 3 == 1 else (247, 177, 133),
        (2, 3, 4, 5, 6, 7, 9, 10, 13)[i],
        (.08 + i * .119) % 1,
    ))


def bezier(path, t):
    p0, p1, p2, p3, *_ = path
    inv = 1 - t
    x = inv**3 * p0[0] + 3 * inv**2 * t * p1[0] + 3 * inv * t**2 * p2[0] + t**3 * p3[0]
    y = inv**3 * p0[1] + 3 * inv**2 * t * p1[1] + 3 * inv * t**2 * p2[1] + t**3 * p3[1]
    return round(x * WIDTH), round(y * HEIGHT)


def frame(seconds):
    glow = Image.new("RGBA", (WIDTH, HEIGHT))
    filaments = Image.new("RGBA", (WIDTH, HEIGHT))
    haze = ImageDraw.Draw(glow)
    ink = ImageDraw.Draw(filaments)

    for index, path in enumerate(PATHS):
        color, laps, offset = path[4:]
        points = [bezier(path, j / 119) for j in range(120)]
        # Subtle architectural guide lines make the topology present even
        # between individual moving tracer heads.
        ink.line(points, fill=(*color, 25 + index % 3 * 8), width=1)
        head = (offset + seconds * laps / DURATION) % 1
        tail = .11 + (index % 4) * .014
        for j in range(1, len(points)):
            progress = j / (len(points) - 1)
            distance = (head - progress) % 1
            if distance > tail or progress > .98:
                continue
            opacity = math.sin(math.pi * distance / tail) ** 1.4
            # More light reaches the camera at the foot of the corridor.
            opacity *= .75 + .35 * progress
            haze.line((points[j-1], points[j]), fill=(*color, round(105 * opacity)), width=8)
            ink.line((points[j-1], points[j]), fill=(*color, round(210 * opacity)), width=2)
            if distance < .012:
                x, y = points[j]
                radius = 2 + index % 2
                haze.ellipse((x-7, y-7, x+7, y+7), fill=(*color, round(85 * opacity)))
                ink.ellipse((x-radius, y-radius, x+radius, y+radius), fill=(255, 242, 245, round(240 * opacity)))

    # The signal bloom breathes over the full minute, not at the short
    # duration of any individual tracer, and returns exactly to its start.
    breathing = (1 + math.sin(TAU * seconds / DURATION - .3)) / 2
    haze.ellipse((470, 430, 545, 540), fill=(240, 143, 189, round(12 + 13 * breathing)))
    glow = glow.filter(ImageFilter.GaussianBlur(4))
    return Image.alpha_composite(glow, filaments)


def run(command):
    subprocess.run(command, check=True)


def main():
    VIDEO_DIR.mkdir(parents=True, exist_ok=True)
    IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    with TemporaryDirectory(prefix="methodologies-film-") as temp:
        still = Path(temp) / "architecture.jpg"
        run(["ffmpeg", "-y", "-loglevel", "error", "-ss", "0.5", "-i", str(SOURCE),
             "-frames:v", "1", str(still)])
        mp4 = VIDEO_DIR / f"{STEM}.mp4"
        command = [
            "ffmpeg", "-y", "-loglevel", "error",
            "-loop", "1", "-framerate", str(FPS), "-i", str(still),
            "-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{WIDTH}x{HEIGHT}",
            "-r", str(FPS), "-i", "pipe:0",
            "-filter_complex", "[1:v]scale=1920:1080:flags=lanczos[signals];"
            "[0:v][signals]overlay=shortest=1:format=auto,format=yuv420p",
            "-t", str(DURATION), "-an", "-c:v", "libx264", "-preset", "fast",
            "-crf", "20", "-movflags", "+faststart", str(mp4),
        ]
        encoder = subprocess.Popen(command, stdin=subprocess.PIPE)
        try:
            for number in range(FPS * DURATION):
                encoder.stdin.write(frame(number / FPS).tobytes())
                if number % (FPS * 10) == 0:
                    print(f"Rendered {number // FPS}/{DURATION}s", flush=True)
        finally:
            encoder.stdin.close()
        if encoder.wait() != 0:
            raise RuntimeError("MP4 encoding failed")

    run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(mp4),
         "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "31",
         "-deadline", "realtime", "-cpu-used", "5",
         str(VIDEO_DIR / f"{STEM}.webm")])
    run(["ffmpeg", "-y", "-loglevel", "error", "-ss", "2", "-i", str(mp4),
         "-frames:v", "1", "-q:v", "3", str(IMAGE_DIR / f"{STEM}-poster.jpg")])
    print(f"Saved {mp4} and matching WebM/poster", flush=True)


if __name__ == "__main__":
    main()