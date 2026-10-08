"""Company-page cover adaptations of the approved original Pulse artwork."""
from pathlib import Path
import base64
import concurrent.futures
import html
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
ART = ROOT / "artifacts/mockup-sandbox/public/images/cognirise/pulse-library"
LOGO = ROOT / "artifacts/cognirise-website/public/images/cognirise/logo-white.svg"
FONT = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")

# Each design uses a separate approved scene and a scene-specific focal band.
DESIGNS = [
    ("01", "governed-intelligence", "Governed intelligence", "governed-ai-control-in-motion", 63),
    ("02", "shared-judgment", "Shared judgment", "human-ai-collaboration-shared-judgment", 67),
    ("03", "operating-rhythm", "Operating rhythm", "orchestration-many-forces-one-rhythm", 56),
    ("04", "living-knowledge", "Living knowledge", "knowledge-intelligence-living-index", 59),
    ("05", "directed-action", "Directed action", "agentic-workflows-directed-action", 62),
    ("06", "balancing-forces", "Balancing forces", "energy-balancing-force", 67),
    ("07", "connected-intelligence", "Connected intelligence", "telecommunications-signal-field", 73),
    ("08", "adaptive-work", "Adaptive work", "manufacturing-adaptive-line", 57),
    ("09", "moving-network", "Moving network", "logistics-moving-network", 56),
    ("10", "responsive-enterprise", "Responsive enterprise", "retail-responsive-space", 62),
]
SIZES = [(4200, 700), (1512, 256)]


def uri(path, mime):
    return f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode()


def render(job):
    design, size = job
    number, slug, title, art, focal = design
    width, height = size
    folder = OUT / f"{width}x{height}"
    folder.mkdir(parents=True, exist_ok=True)
    source = OUT / "sources" / f"{number}-{width}x{height}.html"
    source.parent.mkdir(parents=True, exist_ok=True)
    target = folder / f"{number}-{slug}-{width}x{height}.png"
    source.write_text(f"""<!doctype html><html lang="en"><head>
    <meta charset="utf-8"><title>{html.escape(title)}</title><style>
    *{{box-sizing:border-box}}html,body{{margin:0;width:{width}px;height:{height}px;overflow:hidden}}
    body{{position:relative;background:#071b36}}
    .art{{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% {focal}%}}
    .tone{{position:absolute;inset:0;background:
      linear-gradient(90deg,rgba(4,17,37,.18),transparent 24%,transparent 64%,rgba(4,17,37,.34)),
      radial-gradient(ellipse 42% 90% at 99% 0%,rgba(4,17,37,.93),rgba(4,17,37,.64) 44%,transparent 100%)}}
    .logo{{position:absolute;right:4.5%;top:10%;width:15.5%;height:auto}}
    </style></head><body><img class="art" src="{uri(ART / f'cognirise-pulse-{art}.jpg', 'image/jpeg')}" alt="">
    <div class="tone"></div><img class="logo" src="{uri(LOGO,'image/svg+xml')}" alt="Cognirise"></body></html>""")
    if not target.exists():
        result = subprocess.run([
            "chromium", "--headless", "--no-sandbox", "--disable-gpu", "--hide-scrollbars",
            "--force-device-scale-factor=1", f"--window-size={width},{height}",
            "--virtual-time-budget=2000",
            f"--user-data-dir=/tmp/cognirise-company-{number}-{width}",
            f"--screenshot={target}", source.as_uri()
        ], capture_output=True, timeout=90)
        if result.returncode or not target.exists():
            raise RuntimeError(result.stderr.decode()[-1200:])
    subprocess.run(["magick", str(target), "-strip", "-define", "png:compression-level=9",
                    str(target)], check=True)
    actual = subprocess.check_output(["magick", "identify", "-format", "%wx%h", str(target)]).decode()
    assert actual == f"{width}x{height}", (target, actual)
    if width == 4200:
        upload = target.with_suffix(".jpg")
        subprocess.run(["magick", str(target), "-strip", "-sampling-factor", "4:4:4",
                        "-quality", "95", str(upload)], check=True)
        target = upload
    assert target.stat().st_size < 3_000_000, (target, "Export exceeds 3 MB")
    print("Exported", target.name, flush=True)
    return target


jobs = [(design, size) for design in DESIGNS for size in SIZES]
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    exports = list(pool.map(render, jobs))

preview_dir = OUT / "previews"
preview_dir.mkdir(exist_ok=True)
preview_paths = []
for number, slug, title, _, _ in DESIGNS:
    source = OUT / "4200x700" / f"{number}-{slug}-4200x700.jpg"
    preview = preview_dir / f"{number}.jpg"
    subprocess.run([
        "magick", str(source), "-resize", "1128x188!",
        "-gravity", "South", "-background", "#f8f6f1", "-splice", "0x44",
        "-font", str(FONT), "-fill", "#071b36", "-pointsize", "18",
        "-annotate", "+0+12", f"{number}  {title}", "-quality", "90", str(preview)
    ], check=True)
    preview_paths.append(preview)
subprocess.run(["magick", *map(str, preview_paths), "-append",
                str(OUT / "Cognirise-company-header-preview.jpg")], check=True)

readme = """COGNIRISE — LINKEDIN COMPANY PAGE HEADERS

10 distinct Cognirise Pulse cover designs, each with the official logo at
the top right. There is no additional headline or promotional copy.
These are company-page covers, not 1584 x 396 personal-profile banners.

EXPORTS
4200x700/ — 6:1 company-cover exports.
1512x256/ — compact company-cover exports, approximately 5.9:1.
Each folder contains the same ten designs, adapted to its exact dimensions.
4200-wide files are high-quality JPEG; compact files are PNG.
All upload files are below 3 MB. Full-quality PNG masters are retained
separately in the workspace and are not included in this upload ZIP.

Use the 4200x700 version first. The compact version is included for Page
uploaders or layouts that request 1512 x 256. Do not stretch the images.
Inspect the saved cover on both desktop and mobile: LinkedIn can crop the
outer edges depending on screen size and app layout. The top-right logo
has an inset margin, but no fixed corner placement guarantees every crop.

The original approved 3072 x 3072 Pulse artwork is reframed into a horizontal
focal band rather than stretching an existing personal-page header.
The 4200-wide exports resize the source art; they are not native 4200-wide
AI generations. The vector logo is rendered sharply at each export size.
The full scene runs to both edges; no empty side padding is added.

DESIGNS
""" + "\n".join(f"{n} — {title}" for n, _, title, _, _ in DESIGNS) + """

Sources consulted for company-cover sizing:
https://www.cropyourimage.com/blog/linkedin-company-page-cover-size
https://rightblogger.com/blog/linkedin-banner-size
The guides quote different company-cover recommendations, so both formats
are provided. Both link to LinkedIn Help article a563309.
"""
(OUT / "README.txt").write_text(readme)

archive = OUT / "Cognirise-10-LinkedIn-Company-Headers.zip"
with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as pack:
    for path in exports:
        pack.write(path, path.relative_to(OUT))
    for name in ["README.txt", "Cognirise-company-header-preview.jpg"]:
        pack.write(OUT / name, name)
with zipfile.ZipFile(archive) as pack:
    assert pack.testzip() is None
    assert sum(name.endswith((".png", ".jpg")) and "/" in name for name in pack.namelist()) == 20
print("Verified complete pack:", archive, flush=True)
