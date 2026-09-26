"""Assemble the route-owned methodologies camera journey.

Inputs 01, 02, 03-clean, 04..08 are connected forward camera shots: the last
frame of each shot was the reference image for the next. The rejected 03 shot
contained generated signage and must never be included. Crossfades hide small
generative discontinuities, without reversing or replaying a passage. The
last second resolves to the exact first frame for a gentle native-video loop.

Run: python artifacts/cognirise-website/scripts/render-methodologies-hero.py
Requires FFmpeg. Writes optimized desktop MP4, compact mobile MP4,
720p WebM fallback and poster for the UAE-English route only.
"""

from pathlib import Path
from subprocess import run
from tempfile import TemporaryDirectory


ROOT = Path(__file__).resolve().parents[3]
SHOTS = ROOT / "attached_assets/generated_videos"
VIDEO = ROOT / "artifacts/cognirise-website/public/videos/cognirise"
IMAGES = ROOT / "artifacts/cognirise-website/public/images/cognirise"
STEM = "methodologies-pulse-hero-journey"
ORDER = ("01", "02", "03-clean", "04", "05", "06", "07", "08")
OVERLAP = 0.55
DURATION = 8 * 8 - 7 * OVERLAP


def ffmpeg(*arguments):
    run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", *map(str, arguments)], check=True)


def main():
    sources = [SHOTS / f"methodologies-journey-{shot}.mp4" for shot in ORDER]
    missing = [str(source) for source in sources if not source.is_file()]
    if missing:
        raise FileNotFoundError("Missing original camera shots: " + ", ".join(missing))

    VIDEO.mkdir(parents=True, exist_ok=True)
    IMAGES.mkdir(parents=True, exist_ok=True)
    mp4 = VIDEO / f"{STEM}.mp4"
    mobile = VIDEO / f"{STEM}-720.mp4"
    with TemporaryDirectory(prefix="methodologies-journey-") as directory:
        first = Path(directory) / "first-frame.png"
        assembled = Path(directory) / "assembled.mp4"
        ffmpeg("-i", sources[0], "-frames:v", "1", first)
        inputs = [arg for source in sources for arg in ("-i", source)]
        inputs.extend(("-loop", "1", "-framerate", "24", "-t", "1", "-i", first))

        filters = [
            f"[{index}:v]settb=AVTB,setpts=PTS-STARTPTS,"
            f"scale=1920:1080,setsar=1,format=yuv420p,fps=24[v{index}]"
            for index in range(9)
        ]
        for index in range(1, 8):
            previous = f"v{index - 1}" if index == 1 else f"x{index - 1}"
            offset = index * (8 - OVERLAP)
            filters.append(
                f"[{previous}][v{index}]xfade=transition=fade:"
                f"duration={OVERLAP}:offset={offset:.2f}[x{index}]"
            )
        # The last frame blends into the exact opening view, then native loop
        # restarts the moving camera. This avoids a hard visual cut at 60 s.
        filters.append(
            f"[x7][v8]xfade=transition=fade:duration=1:"
            f"offset={DURATION - 1:.2f},format=yuv420p[out]"
        )
        ffmpeg(
            *inputs, "-filter_complex", ";".join(filters),
            "-map", "[out]", "-an", "-t", f"{DURATION:.2f}",
            "-c:v", "libx264", "-preset", "medium", "-crf", "24",
            "-movflags", "+faststart", assembled,
        )
        ffmpeg(
            "-i", assembled, "-an", "-c:v", "libx264", "-preset", "medium",
            "-crf", "29", "-maxrate", "2500k", "-bufsize", "5000k",
            "-g", "48", "-pix_fmt", "yuv420p", "-movflags", "+faststart", mp4,
        )
        ffmpeg(
            "-i", assembled, "-vf", "scale=1280:720:flags=lanczos",
            "-an", "-c:v", "libx264", "-preset", "medium",
            "-crf", "29", "-maxrate", "1300k", "-bufsize", "2600k",
            "-g", "48", "-pix_fmt", "yuv420p", "-movflags", "+faststart", mobile,
        )
        ffmpeg(
            "-i", assembled, "-vf", "scale=1280:720:flags=lanczos",
            "-an", "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "39",
            "-deadline", "realtime", "-cpu-used", "5", "-row-mt", "1",
            "-threads", "4", VIDEO / f"{STEM}.webm",
        )
        ffmpeg(
            "-ss", "4", "-i", assembled, "-frames:v", "1", "-q:v", "3",
            IMAGES / f"{STEM}-poster.jpg",
        )
    print(f"Saved {DURATION:.2f}s desktop MP4, 720p MP4/WebM and poster: {STEM}")


if __name__ == "__main__":
    main()