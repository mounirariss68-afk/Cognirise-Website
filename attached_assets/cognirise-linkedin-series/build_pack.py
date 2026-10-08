"""Export the LinkedIn editorial series as ready-to-post images and a copy guide."""
from pathlib import Path
import argparse
import base64
import concurrent.futures
import csv
import html
import json
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
POSTS = json.loads((OUT / "posts.json").read_text())
ART = ROOT / "artifacts/mockup-sandbox/public/images/cognirise/pulse-library"
LOGO = ROOT / "artifacts/cognirise-website/public/images/cognirise/logo-white.svg"
FONT = ROOT / "node_modules/.pnpm/@fontsource+comfortaa@5.3.0/node_modules/@fontsource/comfortaa/files/comfortaa-latin-400-normal.woff"
parser = argparse.ArgumentParser()
parser.add_argument("--days", nargs="+", type=int, help="Render only these days; rebuild the complete guide and ZIP.")
ARGS = parser.parse_args()


def data_uri(path, mime):
    return f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode()


def render(post):
    number = f"{post['day']:02}"
    target = OUT / "images" / f"{number}-cognirise-linkedin.png"
    source = OUT / "sources" / f"{number}.html"
    artwork = ROOT / post["artwork_file"] if post.get("artwork_file") else ART / f"cognirise-pulse-{post['art']}.jpg"
    for path in [target.parent, source.parent, OUT / "previews"]:
        path.mkdir(parents=True, exist_ok=True)
    source.write_text(f"""<!doctype html><html><head><meta charset="utf-8"><style>
    @font-face{{font-family:Comfortaa;src:url({data_uri(FONT, 'font/woff')})}}
    *{{box-sizing:border-box}}html,body{{margin:0;width:1600px;height:1600px;overflow:hidden}}
    body{{position:relative;background:#071b36}}
    .art{{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}}
    .shade{{position:absolute;inset:0;background:
      linear-gradient(0deg,rgba(4,17,37,.88),rgba(4,17,37,0) 39%),
      radial-gradient(ellipse 800px 370px at 0 0,rgba(4,17,37,.82),rgba(4,17,37,0) 100%)}}
    .logo{{position:absolute;left:80px;top:80px;width:420px}}
    h1{{position:absolute;right:80px;bottom:88px;max-width:1440px;margin:0;
      font:400 78px/1.3 Comfortaa,sans-serif;letter-spacing:-3px;text-align:right;
      color:#fff9f1;text-shadow:0 3px 20px rgba(0,0,0,.25)}}
    </style></head><body><img class="art" src="{data_uri(artwork, 'image/jpeg')}">
    <div class="shade"></div><img class="logo" src="{data_uri(LOGO, 'image/svg+xml')}">
    <h1>{'<br>'.join(html.escape(line) for line in post['headline'])}</h1></body></html>""")
    proc = subprocess.run([
        "chromium", "--headless", "--no-sandbox", "--disable-gpu", "--hide-scrollbars",
        "--force-device-scale-factor=1", "--window-size=1600,1600", "--virtual-time-budget=2500",
        f"--user-data-dir=/tmp/cognirise-series-browser-{number}",
        f"--screenshot={target}", source.as_uri()
    ], capture_output=True, timeout=90)
    if proc.returncode or not target.exists():
        raise RuntimeError(proc.stderr.decode()[-1500:])
    subprocess.run(["magick", str(target), "-resize", "480x480", "-quality", "83",
                    str(OUT / "previews" / f"{number}.jpg")], check=True)
    return number


for post in POSTS:
    assert len(post["post"]) < 3000
    assert len(post["post"].split("\n")[0]) <= 110
    print(f"Day {post['day']:02}: {len(post['post'])} characters; "
          f"hook {len(post['post'].split(chr(10))[0])} characters", flush=True)

with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
    for number in executor.map(render, [p for p in POSTS if not ARGS.days or p["day"] in ARGS.days]):
        print("Rendered", number, flush=True)

INTRO = """# Cognirise: 10 LinkedIn posts

## Editorial plan

Written for Mounir's personal LinkedIn profile, following the website-launch announcement.
Ten daily publishing slots, arranged as two five-post working weeks. Dates are deliberately
unassigned: start with Day 1 on your next posting day and continue in order. If you want
weekends included, the sequence works unchanged.

**Week 1:** Point of view → services → prototype → methodology → CogniOS.
**Week 2:** CogniDocs → CogniAgents and authority → CogniBase → sovereignty → a practical starting point.

The internal titles organise the calendar. Paste the post copy, not the internal title.
Each matching PNG is 1600 × 1600 and uses original Cognirise Pulse artwork.
The art is conceptual brand illustration, not a screenshot of the product or a literal system diagram.

## Publishing approach

- Use 12:00 Dubai time as an initial slot to test across Gulf and European audiences,
  not as a claim about an ideal LinkedIn posting time. Adjust using your actual audience activity.
- Upload the matching PNG with the complete post text. Each ends with one discussion question.
- Keep the question genuine. Reply thoughtfully when people share specific experiences;
  do not use engagement pods, forced tags or “comment a word” gimmicks.
- Be available after posting if your schedule allows. Quality of replies matters more
  than an arbitrary first-hour target.
- Avoid changing several variables at once. After five posts, compare topic response,
  substantive comments, relevant new connections, follower growth and inbound conversations.
  Normalise by impressions where that information is available.
- These are draft posts grounded in the website's current service and platform descriptions.
  No client names, confidential details, invented quotes or quantified delivery results are included.
- The 48-hour claim is limited to a focused prototype, not a production deployment.
  Illustrative workflows are not presented as completed client engagements.
- Only Cognirise-owned platforms are introduced here. Partner products are not presented
  as Cognirise IP. IDAO stage identities and the Agent Authority distinction are preserved.
- No reach, engagement or follower-growth outcome is guaranteed.

## Files

- `images/01-cognirise-linkedin.png` through `10-cognirise-linkedin.png`
- `posting-guide.html`: self-contained visual guide with the complete copy
- `posting-guide.md`: plain-text copy and editorial notes
- `calendar.csv`: editable publishing calendar

"""
md = INTRO
for p in POSTS:
    md += (f"\n---\n\n## Day {p['day']} · Week {p['week']} — {p['title']}\n\n"
           f"**Theme:** {p['theme']}\n\n"
           f"**Image text:** {' / '.join(p['headline'])}\n\n"
           f"**Visual:** {p['visual']}\n\n"
           f"**Image file:** images/{p['day']:02}-cognirise-linkedin.png\n\n"
           f"### Ready-to-post copy\n\n{p['post']}\n")
(OUT / "posting-guide.md").write_text(md)

with (OUT / "calendar.csv").open("w", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(["Day", "Week", "Date (fill in)", "Initial test time (Dubai)",
                     "Title", "Theme", "Visual headline", "Image file", "Post copy", "Status"])
    for p in POSTS:
        writer.writerow([p["day"], p["week"], "", "12:00", p["title"], p["theme"],
                         " / ".join(p["headline"]), f"images/{p['day']:02}-cognirise-linkedin.png",
                         p["post"], "Draft — ready for review"])

sections = []
for p in POSTS:
    preview = data_uri(OUT / "previews" / f"{p['day']:02}.jpg", "image/jpeg")
    sections.append(f"""<section id="day-{p['day']}">
      <header><span>WEEK {p['week']} / DAY {p['day']:02}</span><h2>{html.escape(p['title'])}</h2>
      <p>{html.escape(p['theme'])}</p></header>
      <div class="layout"><aside><img src="{preview}" alt="{html.escape(p['visual'])}">
      <p>{html.escape(p['visual'])}</p><small>Image: {p['day']:02}-cognirise-linkedin.png<br>
      {len(p['post']):,} characters · Conceptual Pulse artwork</small></aside>
      <article><h3>Ready-to-post copy</h3><div class="post">{html.escape(p['post'])}</div></article></div>
      </section>""")
guide = f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Cognirise — 10-post LinkedIn series</title>
<style>@font-face{{font-family:Comfortaa;src:url({data_uri(FONT, 'font/woff')})}}
*{{box-sizing:border-box}}body{{margin:0;background:#f8f6f1;color:#071b36;font:16px/1.65 system-ui,sans-serif}}
.hero{{background:#071b36;color:#fff9f1;padding:64px max(6vw,24px)}}
h1,h2{{font-family:Comfortaa,sans-serif;font-weight:400;line-height:1.25}}h1{{font-size:clamp(30px,5vw,58px);max-width:900px}}
.hero>p{{max-width:820px;color:#d4dbea}}.hero img{{width:230px}}
nav{{display:flex;flex-wrap:wrap;gap:10px;margin-top:26px}}nav a{{color:white;text-decoration:none;border-bottom:2px solid #db509e;padding:8px}}
.notes{{margin:40px auto;padding:0 24px;max-width:1200px}}.notes p{{max-width:960px}}
section{{max-width:1200px;margin:0 auto;padding:46px 24px 60px;border-top:1px solid #ccc}}
header span{{font-size:12px;letter-spacing:2px;color:#a52f77}}h2{{font-size:30px;margin:15px 0}}
header>p{{color:#526074}}.layout{{display:grid;grid-template-columns: .9fr 1.1fr;gap:40px;align-items:start}}
aside img{{width:100%;height:auto}}aside p,small{{font-size:14px;color:#526074}}h3{{margin-top:0;font-size:13px;letter-spacing:1px;text-transform:uppercase}}
.post{{white-space:pre-wrap;font-size:17px;line-height:1.65}}a{{color:inherit}}
@media(max-width:760px){{.layout{{grid-template-columns:1fr}}section{{padding-top:32px}}h2{{font-size:25px}}}}
@media print{{.hero{{padding:24px}}nav{{display:none}}section{{break-before:page}}.layout{{grid-template-columns:240px 1fr;gap:25px}}.post{{font-size:11px}}}}
</style></head><body><div class="hero"><img src="{data_uri(LOGO,'image/svg+xml')}" alt="Cognirise">
<h1>Ten posts.<br>A clear introduction to Cognirise.</h1>
<p>A founder-led LinkedIn series: the work, the thinking, the services and the platforms.
Two five-post weeks following the website-launch announcement. Ready-to-post copy and matching original Pulse visuals.</p>
<nav>{''.join(f'<a href="#day-{p["day"]}">Day {p["day"]:02}</a>' for p in POSTS)}</nav></div>
<div class="notes"><h2>How to use this series</h2>
<p>Start on your next posting day. Dates are left open; publish in sequence. Each post is written for
Mounir’s personal profile. Upload its numbered PNG and paste the ready-to-post copy.
The section titles are for planning—not extra text to add to the post.</p>
<p><strong>Initial timing to test:</strong> 12:00 Dubai time, to overlap Gulf and European working hours.
Adjust to your audience. This is a starting hypothesis, not a guaranteed best time.</p>
<p><strong>Measure relevance, not just reactions:</strong> substantive comments, relevant new connections,
follower growth and inbound conversations. Review the first five posts before changing the next five.
Answer genuine questions and avoid forced engagement tactics.</p>
<p><strong>Editorial boundaries:</strong> no invented client outcomes, no product screenshots implied by
conceptual artwork, no automatic approval claims. “48 hours” describes a focused prototype, not production readiness.
Full publishing notes and an editable calendar are included in the ZIP.</p></div>
{''.join(sections)}</body></html>"""
(OUT / "posting-guide.html").write_text(guide)

archive = OUT / "Cognirise-10-LinkedIn-Posts-and-Visuals.zip"
with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as z:
    for path in sorted((OUT / "images").glob("*.png")):
        z.write(path, path.relative_to(OUT))
    for name in ["posting-guide.html", "posting-guide.md", "calendar.csv"]:
        z.write(OUT / name, name)
print("PACK READY:", archive, flush=True)
