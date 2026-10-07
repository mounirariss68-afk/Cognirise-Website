"""Deterministic editorial extraction. No HTML, CSS, scripts or shell are stored.

Run from the repository root. Output is the bounded Public Sector manuscript
model; React owns its presentation. Sources and inherited dates are retained.
"""
from html.parser import HTMLParser
from pathlib import Path
import hashlib
import json
import re
import sys

# Two concrete 404s resolved to the same cited works, not replacement claims.
# The original URLs remain in the source mapping alongside these corrections.
SOURCE_URL_CORRECTIONS = {
    "https://preview.aclanthology.org/eacl-dois/2025.arabicnlp-main.21": "https://aclanthology.org/2025.arabicnlp-main.21/",
    "https://www.capgemini.com/news/press-releases/egovernment-benchmark-2025-digitalization-of-public-services-in-the-eu-accelerates-but-cybersecurity-and": "https://www.capgemini.com/news/press-releases/egovernment-benchmark-2025-digitalization-of-public-services-in-the-eu-accelerates-but-cybersecurity-and-cross-border-challenges-remain/",
}

class Node:
    def __init__(self, tag="", attrs=None):
        self.tag, self.attrs, self.children = tag, dict(attrs or []), []


class Parser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node("root")
        self.stack = [self.root]

    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs)
        self.stack[-1].children.append(node)
        if tag not in {"img", "br", "meta", "link", "hr", "input"}:
            self.stack.append(node)

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                self.stack = self.stack[:i]
                break

    def handle_data(self, data):
        self.stack[-1].children.append(data)


def text(node):
    if isinstance(node, str):
        return node
    if node.tag in {"svg", "style", "script"}:
        return ""
    return "".join(text(child) for child in node.children)


def normalized(node):
    return re.sub(r"\s+", " ", text(node)).strip()


def descendants(node, tag=None, cls=None):
    if isinstance(node, str):
        return []
    found = []
    for child in node.children:
        if not isinstance(child, str):
            if (not tag or child.tag == tag) and (not cls or cls in child.attrs.get("class", "").split()):
                found.append(child)
            found.extend(descendants(child, tag, cls))
    return found


def inline(node, inherited=None):
    inherited = dict(inherited or {})
    if isinstance(node, str):
        return [{"text": re.sub(r"\s+", " ", node), **inherited}] if node else []
    if node.tag in {"svg", "style", "script", "img"}:
        return []
    if node.tag == "br":
        return [{"text": "\n", **inherited}]
    if node.tag in {"strong", "b"}:
        inherited["strong"] = True
    if node.tag == "em":
        inherited["emphasis"] = True
    if node.tag == "a":
        href = node.attrs["href"]
        inherited["href"] = SOURCE_URL_CORRECTIONS.get(href, href)
    return [run for child in node.children for run in inline(child, inherited)]


def copy(node, style="body"):
    return {"type": "copy", "style": style, "runs": inline(node)}


def blocks(node, section_title):
    if node.tag in {"li", "th", "td"}:
        structural = {"div", "p", "h2", "h3", "h4", "ul", "ol", "table", "blockquote"}
        if not any(isinstance(child, Node) and child.tag in structural for child in node.children):
            return [copy(node)]
    result = []
    for child in node.children:
        if isinstance(child, str):
            if child.strip():
                result.append(copy(child))
            continue
        cls = child.attrs.get("class", "").split()
        if child.tag in {"style", "svg", "script"}:
            continue
        if "ps-mock" in cls:
            get = lambda c: normalized(descendants(child, cls=c)[0])
            fields = []
            for field in descendants(child, cls="ps-fld"):
                fields.append({
                    "label": normalized(descendants(field, "b")[0]),
                    "value": normalized(descendants(field, "span")[0]),
                    "status": normalized(descendants(field, "em")[0]),
                    "editableExample": "touch" in field.attrs.get("class", "").split(),
                })
            result.append({
                "type": "action-card", "tone": "pink" if "pink" in cls else "coral" if "coral" in cls else "violet",
                "kicker": get("k"), "title": normalized(descendants(child, "h4")[0]), "issuer": get("iss"),
                "fields": fields, "consequence": get("ps-cons"), "declaration": get("ps-decl"), "actionLabel": get("ps-btn"),
            })
        elif child.tag == "table":
            headers = descendants(descendants(child, "thead")[0], "tr")[0]
            rows = descendants(descendants(child, "tbody")[0], "tr")
            cells = lambda row: [blocks(cell, section_title) for cell in row.children if isinstance(cell, Node) and cell.tag in {"th", "td"}]
            result.append({"type": "table", "caption": section_title, "headers": cells(headers), "rows": [cells(row) for row in rows]})
        elif child.tag in {"h2", "h3", "h4"}:
            result.append({"type": "heading", "level": int(child.tag[1]), "runs": inline(child)})
        elif child.tag in {"ul", "ol"}:
            items = []
            for li in child.children:
                if isinstance(li, Node) and li.tag == "li":
                    items.append(blocks(li, section_title))
            result.append({"type": "list", "numbered": child.tag == "ol", "items": items})
        elif child.tag in {"p", "blockquote", "a", "strong", "b", "span", "em", "i"}:
            styles = {"ps-kicker": "kicker", "ps-note": "note", "ps-callout": "callout", "ps-legend": "legend",
                      "ps-footnote": "footnote", "ps-src": "source", "ps-candidates": "candidates"}
            result.append(copy(child, next((styles[c] for c in cls if c in styles), "callout" if child.tag == "blockquote" else "body")))
        else:
            layouts = {"ps-head": "head", "ps-rich": "rich", "ps-sub": "sub", "ps-cards": "cards", "ps-card": "card",
                       "req": "requirement", "ps-two": "two", "ps-stats": "stats", "ps-stat": "stat", "ps-bands": "bands",
                       "ps-band": "band", "ps-formats": "formats", "ps-format": "format", "ps-mocks": "mocks",
                       "ps-mock-legend": "mock-legend"}
            layout = next((layouts[c] for c in cls if c in layouts), None)
            # ps-two ps-rich is still a two-column relationship.
            if "ps-two" in cls:
                layout = "two"
            if layout == "cards":
                layout += "-four" if "four" in cls else "-two" if "two" in cls else ""
            if layout:
                result.append({"type": "panel", "layout": layout, "blocks": blocks(child, section_title)})
            elif child.tag == "div" and "ps-table-wrap" not in cls:
                # Preserve the author's semantic relationships: the left
                # heading stack and right introduction, the two parallel
                # tracks, and each metric's value/description stay together.
                nested = blocks(child, section_title)
                if nested:
                    result.append({"type": "panel", "layout": "plain", "blocks": nested})
            else:
                result.extend(blocks(child, section_title))
    return result


IDS = ["distinction", "elements", "position", "change-1", "change-2", "change-3", "change-4", "change-5", "change-6",
       "tracks", "priorities", "impact", "closing", "research"]
FILES = {
    "uae": "public-sector_uae_1791362671434.html", "ksa": "public-sector_ksa_1791362671434.html",
    "turkiye": "public-sector_turkiye_1791362671434.html", "europe": "public-sector_europe_1791362671433.html",
}
output, mapping = {}, {}
for market, filename in FILES.items():
    source = Path("attached_assets", filename).read_text()
    parser = Parser()
    parser.feed(source)
    main = descendants(parser.root, "main")[0]
    sections = [n for n in main.children if isinstance(n, Node) and n.tag == "section"]
    assert len(sections) == 15, (market, len(sections))
    hero = sections[0]
    body = descendants(hero, "p")[-1]
    research = sections[-1]
    source_links = descendants(research, "a")
    sources = []
    for li in descendants(research, "li"):
        links = descendants(li, "a")
        if links:
            supports = normalized(li)
            original_url = links[0].attrs["href"]
            url = SOURCE_URL_CORRECTIONS.get(original_url, original_url)
            official = any(domain in url for domain in [".gov.", "u.ae/", "uaecabinet.ae/", "mediaoffice.ae/", "dge.gov.ae/", "digitaldubai.ae/", "spa.gov.sa/", "dga.gov.sa/", "eur-lex.europa.eu/", "digital-strategy.ec.europa.eu/", "commission.europa.eu/", "oecd"])
            sources.append({"label": normalized(links[0]), "url": url, "publisher": normalized(links[0]),
                            "kind": "Official source" if official else "Independent study", "market": market, "supports": supports,
                            "limitation": "Attachment attribution and inherited research date; not independently reverified by this import."})
    native_sections = []
    for section_id, section in zip(IDS, sections[1:]):
        title = normalized(descendants(section, "h2")[0])
        native_sections.append({"id": section_id, "title": title,
                                "surface": "lilac" if section_id == "closing" else "ivory" if "alt" in section.attrs.get("class", "").split() else "paper",
                                "blocks": blocks(section, title)})
    # Normalize rich cell text without dropping standalone prose in li/th/td.
    output[market] = {
        "thesis": normalized(descendants(hero, "h1")[0]), "dek": normalized(body),
        "sources": sources,
        "publicSectorNative": {
            "version": 2, "market": market,
            "marketLabel": {"uae": "United Arab Emirates", "ksa": "Saudi Arabia", "turkiye": "Türkiye", "europe": "Europe"}[market],
            "sourceDate": "2026-10-07",
            "researchDateQualification": "The source manuscript labels its research as checked 7 October 2026. That date is inherited from the supplied manuscript, not a new verification performed during website integration.",
            "reviewBlockers": [], "sections": native_sections,
        },
    }
    # Coverage checks compare every substantive leaf of the authored main,
    # rather than counting headings while silently dropping table/card prose.
    def leaves(node):
        if isinstance(node, str):
            return [normalized(node)] if normalized(node) else []
        if node.tag in {"svg", "style", "script"}:
            return []
        return [part for child in node.children for part in leaves(child)]
    # Use decoded JSON strings, so quotes and escaped line breaks are compared
    # as prose, not JSON serialization syntax.
    def strings(value):
        if isinstance(value, str):
            return [value]
        if isinstance(value, list):
            return [s for v in value for s in strings(v)]
        if isinstance(value, dict):
            return [s for v in value.values() for s in strings(v)]
        return []
    delivered = re.sub(r"\s+", " ", " ".join(strings(output[market])))
    missing = [leaf for section in sections[1:] for leaf in leaves(section)
               if len(leaf) > 1 and leaf not in delivered]
    assert not missing, (market, "Missing source prose", missing[:5])
    mapping[market] = {
        "attachment": f"attached_assets/{filename}", "sha256": hashlib.sha256(source.encode()).hexdigest(),
        "sectionSequence": [{"id": item["id"], "title": item["title"]} for item in native_sections],
        "tables": len(descendants(main, "table")), "illustrations": len(descendants(main, cls="ps-mock")),
        "researchLinks": [SOURCE_URL_CORRECTIONS.get(n.attrs["href"], n.attrs["href"]) for n in source_links],
        "inheritedResearchLinks": [n.attrs["href"] for n in source_links],
        "citationCorrections": {n.attrs["href"]: SOURCE_URL_CORRECTIONS[n.attrs["href"]] for n in source_links if n.attrs["href"] in SOURCE_URL_CORRECTIONS},
        "inheritedResearchDate": "2026-10-07", "executorResearchVerification": False,
    }
for filename, data in [("scripts/src/cms/public-sector-native-content.json", output), ("docs/public-sector-native-source-mapping.json", mapping)]:
    serialized = json.dumps(data, ensure_ascii=False, indent=2) + "\n"
    if "--check" in sys.argv:
        assert Path(filename).read_text() == serialized, f"{filename}: run the extractor to reconcile source changes."
    else:
        Path(filename).write_text(serialized)
print("Four manuscripts: complete prose, semantic tables, static card fields and source trails matched.")
