"""Export the current launch sitemap without changing the live site's sitemap."""
from pathlib import Path
import argparse
import concurrent.futures
import csv
import html
import json
import re
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
import zipfile
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
parser = argparse.ArgumentParser()
parser.add_argument("--origin", required=True, help="Verified production origin from deployment metadata")
args = parser.parse_args()
origin = args.origin.rstrip("/")


def fetch(path):
    with urllib.request.urlopen(origin + path, timeout=30) as response:
        return response.read()


live = ET.fromstring(fetch("/sitemap.xml"))
live_urls = [row.find("{*}loc").text for row in live]
canonical = urllib.parse.urlsplit(live_urls[0])
base = f"{canonical.scheme}://{canonical.netloc}"
cms = json.loads(fetch("/api/public/sitemap?market=uae&locale=en"))
release = json.loads(fetch("/api/public/releases/uae/en/manifest"))["manifest"]
registry_text = (ROOT / "lib/api-zod/src/release-contract.ts").read_text().split("routes: [", 1)[1].split("],", 1)[0]
registry = re.findall(r'page\("([^"]+)", "([^"]+)"', registry_text)
policy_text = (ROOT / "lib/api-zod/src/launch-policy.ts").read_text()
policy = {key: value == "true" for key, value in re.findall(r"(\w+): (true|false)", policy_text)}


def allowed(path):
    if ":" in path or path.startswith(("/admin", "/api", "/preview", "/__mockup", "/downloads", "/faq")):
        return False
    if not policy.get("enabled", False):
        return True
    if path == "/platforms/cognios":
        return policy.get("cognios", False)
    if path.startswith("/platforms") and not policy.get("platforms", False):
        return False
    if path.startswith("/insights") and not policy.get("insights", False):
        return False
    if path.startswith("/partners") and not policy.get("partnerLinks", False):
        return False
    return True


paths = {path for _, path in registry if allowed(path)}
released_dynamic = {
    entry["route"] for entry in release["revisions"]
    if (entry.get("route") or "").startswith("/work/")
}
for entry in cms.get("items", []):
    path = urllib.parse.urlsplit(entry["url"]).path
    if path in released_dynamic and allowed(path):
        paths.add(path)
assert paths and not any(":" in path for path in paths)
ordered = sorted(paths, key=lambda path: (path != "/", path))


def check(path):
    request = urllib.request.Request(origin + path, method="HEAD")
    with urllib.request.urlopen(request, timeout=30) as response:
        assert response.status == 200, (path, response.status)
        assert urllib.parse.urlsplit(response.url).path.rstrip("/") == path.rstrip("/"), (path, response.url)
    return path


with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    list(pool.map(check, ordered))

NS = "http://www.sitemaps.org/schemas/sitemap/0.9"
ET.register_namespace("", NS)
tree = ET.Element(f"{{{NS}}}urlset")
for path in ordered:
    row = ET.SubElement(tree, f"{{{NS}}}url")
    ET.SubElement(row, f"{{{NS}}}loc").text = base + path
ET.indent(tree, space="  ")
ET.ElementTree(tree).write(OUT / "sitemap.xml", encoding="utf-8", xml_declaration=True)
assert len(ET.parse(OUT / "sitemap.xml").getroot()) == len(ordered)

TITLE_OVERRIDES = {
    "/": "Home", "/about": "Our team", "/about/core-values": "Core values",
    "/platforms/cognios": "CogniOS", "/methodologies/idao": "IDAO",
    "/methodologies/agent-authority-model": "Agent Authority Model",
    "/contact": "Contact", "/value-scan": "Value Scan",
    "/industries/telecoms": "Telecoms",
    "/what-we-do/engineering-with-ai": "Engineering with AI",
    "/what-we-do/data-ai-foundations": "Data & AI foundations",
    "/what-we-do/sovereign-regulated-ai": "Sovereign & regulated AI",
    "/what-we-do/digital-ai-workforce": "Digital AI workforce",
}
GROUPS = [
    ("Home", lambda path: path == "/"),
    ("Services", lambda path: path.startswith("/what-we-do/")),
    ("Methodologies", lambda path: path.startswith("/methodologies")),
    ("Platforms", lambda path: path.startswith("/platforms/")),
    ("Industries", lambda path: path.startswith("/industries")),
    ("Case studies", lambda path: path.startswith("/work/")),
    ("Company", lambda path: path.startswith("/about")),
    ("Contact & assessment", lambda path: path in ("/contact", "/value-scan")),
]


def title(path):
    return TITLE_OVERRIDES.get(path, path.rsplit("/", 1)[-1].replace("-", " ").capitalize())


rows = []
for group, matches in GROUPS:
    for path in ordered:
        if matches(path):
            rows.append({"section": group, "page": title(path), "path": path, "url": base + path})
assert len(rows) == len(ordered)
with (OUT / "sitemap.csv").open("w", newline="") as file:
    writer = csv.DictWriter(file, fieldnames=["section", "page", "path", "url"])
    writer.writeheader()
    writer.writerows(rows)

generated = datetime.now(timezone.utc).isoformat(timespec="seconds")
cards = ""
for group, _ in GROUPS:
    entries = [row for row in rows if row["section"] == group]
    if not entries:
        continue
    links = "".join(
        f'<li><a href="{html.escape(row["url"])}">{html.escape(row["page"])}</a>'
        f'<small>{html.escape(row["path"])}</small></li>' for row in entries
    )
    cards += f'<section><h2>{html.escape(group)}</h2><ul>{links}</ul></section>'
(OUT / "sitemap.html").write_text(f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Cognirise sitemap</title>
<style>*{{box-sizing:border-box}}body{{margin:0;background:#fdfcfb;color:#071b36;font:16px/1.55 system-ui,sans-serif}}
header{{background:#071b36;color:#fff9f1;padding:40px max(5vw,24px);border-bottom:4px solid #d74c9d}}
header small{{letter-spacing:2px;text-transform:uppercase;color:#ec90c6}}h1{{font-size:42px;font-weight:500;margin:8px 0}}
header p{{max-width:900px;color:#d4dbea}}main{{max-width:1450px;margin:auto;padding:32px 24px}}
.map{{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;align-items:start}}
section{{padding:22px;background:#f4f1f7;border-top:3px solid #8853c7}}h2{{font-size:19px;margin:0 0 15px}}
ul{{list-style:none;padding:0;margin:0}}li{{border-top:1px solid #ded8e8;padding:12px 0}}
a{{color:#071b36;text-decoration:none;font-weight:600}}a:hover{{color:#a52f77;text-decoration:underline}}
li small{{display:block;overflow-wrap:anywhere;font-size:12px;color:#566378}}footer{{margin-top:28px;color:#566378;font-size:13px}}
@media(max-width:900px){{.map{{grid-template-columns:repeat(2,minmax(0,1fr))}}}}
@media(max-width:600px){{.map{{grid-template-columns:1fr}}h1{{font-size:34px}}}}
</style></head><body><header><small>Cognirise / public website</small><h1>Website sitemap</h1>
<p>{len(rows)} canonical pages for the current launch. Hidden platforms, insights, partner pages,
preview links, admin routes and redirects are excluded.</p></header>
<main><div class="map">{cards}</div><footer>Generated {html.escape(generated)}.
Canonical domain: {html.escape(base)}. Current launch scope: UAE English.
Live route policy and published CMS case-study availability were checked. HTTP reachability was checked;
this is a downloadable snapshot, not a modification of the live sitemap.</footer></main></body></html>""")

live_paths = {urllib.parse.urlsplit(url).path for url in live_urls}
added = sorted(paths - live_paths)
(OUT / "README.txt").write_text(f"""COGNIRISE WEBSITE SITEMAP
Generated: {generated}
Canonical domain: {base}
Total canonical pages: {len(rows)}
Current launch scope: UAE English; region-query variants are not separate canonical URLs.

FILES
sitemap.xml — standard XML sitemap for search engines.
sitemap.csv — editable page inventory, with sections and URLs.
sitemap.html — self-contained, readable sitemap with clickable page links.
README.txt — scope and validation notes.

SOURCE AND EXCLUSIONS
Generated from the current launch-approved registered routes, live sitemap,
and publicly delivered CMS inventory. Dynamic case studies are included only
when also present in the active immutable release manifest.
Hidden platforms (except CogniOS), insights, partners, FAQ, aliases, preview
capabilities, admin paths, API paths, downloads and fragment-only links are omitted.
No fabricated last-modified dates, priority weights or change frequencies.
Each included route responded with HTTP 200 without changing its route path.
HTTP 200 alone does not prove page content: this site is a client-rendered app.
The launch policy and registered-route/release authority determine inclusion.

LIVE SITEMAP DIFFERENCE
The currently served sitemap has {len(live_paths)} paths. This snapshot adds:
""" + "\n".join(added) + """

This export has NOT replaced the production site's sitemap.xml, updated
robots.txt, submitted anything to Google, or published changes.
""")
archive = OUT / "Cognirise-Website-Sitemap.zip"
with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as pack:
    for name in ["sitemap.xml", "sitemap.csv", "sitemap.html", "README.txt"]:
        pack.write(OUT / name, name)
with zipfile.ZipFile(archive) as pack:
    assert pack.testzip() is None
print(f"Verified {len(rows)} URLs; {len(added)} additions to the live sitemap.")
print(archive)
