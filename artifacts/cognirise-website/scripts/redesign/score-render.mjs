// Score rendered pages (render.json) with the audit's checks.
import { readFileSync } from "node:fs";

const file = process.argv[2] ?? "scripts/redesign/out/render.json";
const pages = JSON.parse(readFileSync(file, "utf8"));

const RETIRED = ["consequential", "governed", "governance", "accountab", "bounded", "momentum", "forward-deployed", "illustrative", "evidence-led", "operating reality", "operating gap", "operating pressure"];
const INTELLIGENCE = /\bintelligence\b/i; // allowed only inside a proper noun we know
const AMERICAN = ["organization", "prioritiz", "judgment\\b", "\\blicense\\b", "\\bcenter\\b", "optimiz", "analyze", "summariz", "authoriz", "\\bprogram\\b", "\\bprograms\\b", "licensing"];
const INTERNAL = ["not yet published", "inherited from", "as reported by cognirise", "manuscript", "supplied figure", "withheld pending", "in the cms", "editorial review", "capabilities presentation", "no standalone"];
const RISKY = ["\\brapid", "\\bcheap", "guarantee", "seamless", "cutting-edge", "world-class", "market-leading", "leverag", "\\brobust", "holistic", "synerg", "best-in-class", "state-of-the-art", "\\bunlock", "\\bempower", "\\belevate"];
const LIMITS = { "/case-studies": 1200, "/about/core-values": 1200, "/industries/public-sector/point-of-view": 2500 };
const ARTICLE_LIMIT = 2500;

function sylls(w) { const m = w.toLowerCase().replace(/[^a-z]/g, "").replace(/e$/, "").match(/[aeiouy]+/g); return m ? m.length : 1; }

for (const page of pages) {
  const route = page.route.split("?")[0];
  // Strip the shared header and footer text: the measured text is the main content, which the extractor already scoped to <main>.
  const text = page.text;
  const words = text.split(/\s+/).filter(Boolean);
  const sentences = text.replace(/\n+/g, ". ").split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.split(/\s+/).length >= 3);
  const nw = words.length, ns = Math.max(1, sentences.length);
  const nsy = words.reduce((a, w) => a + sylls(w), 0);
  const fk = +(0.39 * (nw / ns) + 11.8 * (nsy / nw) - 15.59).toFixed(1);
  const long = sentences.filter((s) => s.split(/\s+/).length > 30);
  const counts = {}; sentences.forEach((s) => { if (s.split(/\s+/).length >= 6) counts[s] = (counts[s] || 0) + 1; });
  const repeated = Object.entries(counts).filter(([, c]) => c >= 2).map(([s, c]) => `${c}x ${s.slice(0, 70)}`);
  // Proper nouns that contain a retired or American-spelled word are allowed: the rule is about the register, not names.
  const PROPER_NOUNS = ["Federal Authority for Artificial Intelligence and Data", "Year of Artificial Intelligence", "Ministerial Council for Artificial Intelligence and Development", "Organization of Turkic States", "Institute of Electrical", "Document Intelligence", "Business Intelligence"];
  const low = PROPER_NOUNS.reduce((t, noun) => t.split(noun).join(" "), text).toLowerCase();
  const hits = (list) => list.map((k) => [k, (low.match(new RegExp(k, "g")) || []).length]).filter(([, n]) => n > 0);
  const intelligence = (PROPER_NOUNS.reduce((t, noun) => t.split(noun).join(" "), text).match(/[^.\n]*\bintelligence\b[^.\n]*/gi) || []);
  const h1s = page.headings.filter((h) => h.level === 1);
  const h1w = h1s[0] ? h1s[0].text.split(/\s+/).filter(Boolean).length : 0;
  let skips = 0; for (let i = 1; i < page.headings.length; i++) if (page.headings[i].level > page.headings[i - 1].level + 1) skips++;
  const empty = page.headings.filter((h) => !h.text).length;
  const noAlt = page.images.filter((img) => img.alt === null);
  const limit = route.startsWith("/methodologies/") ? ARTICLE_LIMIT : (LIMITS[route] ?? 900);
  const is404 = route === "/this-page-does-not-exist";
  const checks = {
    length: nw <= limit,
    h1: h1w > 0 && h1w <= 8,
    longSentences: long.length === 0,
    grade: fk <= 10,
    retired: hits(RETIRED).length === 0 && intelligence.length === 0,
    repeated: repeated.length === 0,
    spelling: hits(AMERICAN).length === 0,
    internal: hits(INTERNAL).length === 0,
    title: page.title.length > 0 && page.title.length <= 60,
    description: is404 ? true : page.description.length >= 70 && page.description.length <= 155,
    headings: h1s.length === 1 && skips === 0 && empty === 0,
    altText: noAlt.length === 0,
    oneMain: page.mains === 1,
    risky: hits(RISKY).length === 0,
    noErrors: page.errors.filter((e) => !/favicon|net::ERR|Failed to load resource|404/.test(e)).length === 0,
  };
  const fails = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
  const score = `${Object.values(checks).filter(Boolean).length}/${Object.keys(checks).length}`;
  console.log(`${page.route.padEnd(44)} words=${String(nw).padStart(5)} grade=${String(fk).padStart(4)} h1w=${h1w} title=${page.title.length} desc=${page.description.length} ${score} ${fails.length ? "FAIL: " + fails.join(", ") : "PASS"}`);
  if (fails.includes("longSentences")) console.log("   long:", long.map((s) => s.slice(0, 100)));
  if (fails.includes("repeated")) console.log("   repeated:", repeated);
  if (fails.includes("retired")) console.log("   retired:", hits(RETIRED), intelligence.slice(0, 3));
  if (fails.includes("spelling")) console.log("   american:", hits(AMERICAN));
  if (fails.includes("internal")) console.log("   internal:", hits(INTERNAL));
  if (fails.includes("risky")) console.log("   risky:", hits(RISKY));
  if (fails.includes("headings")) console.log("   headings:", h1s.length, "h1;", skips, "skips;", empty, "empty;", page.headings.map((h) => `${h.level}:${h.text.slice(0, 30)}`).join(" | "));
  if (fails.includes("altText")) console.log("   no alt:", noAlt.map((i) => i.src));
  if (fails.includes("oneMain")) console.log("   mains:", page.mains);
  if (fails.includes("noErrors")) console.log("   errors:", page.errors.slice(0, 3));
  if (fails.includes("title")) console.log("   title:", page.title);
  if (fails.includes("description")) console.log("   description:", page.description);
  if (fails.includes("length")) console.log("   words", nw, "limit", limit);
  if (fails.includes("h1")) console.log("   h1:", h1s.map((h) => h.text));
}
