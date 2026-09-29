"""Assemble concept 3, The living team portrait.

Four original 1080p shots: UAE-based leader, embedded FDE and colleague,
assurance checkpoint, coordinated four-person decision. A fifth copy of
the opening supplies a forward-moving circular dissolve, not reverse play.
The cut starts and ends at the same frame of that opening shot.
"""

from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1] / "public"
VIDEO = ROOT / "videos/cognirise"
IMAGES = ROOT / "images/cognirise"
SOURCE_MEDIA = ROOT.parent / "assets/team-living-portrait"
STEMS = ["lead", "fde", "control", "together", "lead"]
SOURCE = lambda stem: SOURCE_MEDIA / f"team-portrait-{stem}-source.mp4"
MP4 = VIDEO / "team-living-portrait.mp4"
WEBM = VIDEO / "team-living-portrait.webm"
POSTER = IMAGES / "team-living-portrait-poster.jpg"

# 8s source shots, 0.9s dissolves at 7.1, 14.2, 21.3, 28.4.
# After the final dissolve, the repeated opening is at second 0.9.
# Trim second 2.0 through 30.4: first and last frame coincide in time
# without reversing any action or jumping from the group back to a stranger.
FILTER = (
    "".join(
        # The image-conditioned footage has dark side extensions. The
        # photographed square field is the actual authored composition;
        # object-cover then makes the responsive hero crop without bars.
        f"[{n}:v]crop=1080:1080:420:0,format=yuv420p,setpts=PTS-STARTPTS,fps=24[v{n}];"
        for n in range(5)
    )
    + "[v0][v1]xfade=transition=fade:duration=0.9:offset=7.1[x1];"
    + "[x1][v2]xfade=transition=fade:duration=0.9:offset=14.2[x2];"
    + "[x2][v3]xfade=transition=fade:duration=0.9:offset=21.3[x3];"
    + "[x3][v4]xfade=transition=fade:duration=0.9:offset=28.4[x4];"
    + "[x4]trim=start=2:end=30.4,setpts=PTS-STARTPTS,format=yuv420p[film]"
)


def main() -> None:
    for stem in set(STEMS):
        if not SOURCE(stem).is_file():
            raise FileNotFoundError(SOURCE(stem))
    inputs = [value for stem in STEMS for value in ("-i", str(SOURCE(stem)))]
    subprocess.run(
        [
            "ffmpeg", "-y", "-loglevel", "error", *inputs,
            "-filter_complex", FILTER, "-map", "[film]", "-an",
            "-c:v", "libx264", "-preset", "fast", "-crf", "21",
            "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(MP4),
        ],
        check=True,
    )
    # The human team, agent routes and checkpoint remain visible in the
    # immediate still; avoid the former film's flaring exception frame.
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-ss", "23.0", "-i", str(MP4),
         "-frames:v", "1", "-q:v", "2", str(POSTER)],
        check=True,
    )
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(MP4), "-an",
         "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "33", "-row-mt", "1",
         str(WEBM)],
        check=True,
    )


if __name__ == "__main__":
    main()