import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const websiteRoot = new URL("../../", import.meta.url);

test("publishes the requested leadership roster before the advisory board", async () => {
  const source = await readFile(new URL("src/pages/AboutPeople.tsx", websiteRoot), "utf8");
  const roster = [
    ["Mounir Ariss", "CEO & Co-founder"],
    ["Bulent Egrilmez", "CTO & Co-founder"],
    ["Omer Barbaros Yis", "Co-founder"],
    ["Hisham Nofal, PhD.", "Education Sector lead"],
  ] as const;

  let previous = -1;
  for (const [name, title] of roster) {
    const position = source.indexOf(`name: "${name}"`);
    assert.ok(position > previous, `${name} must appear in the requested order`);
    assert.match(source.slice(position, position + 180), new RegExp(`title: "${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
    previous = position;
  }

  const boardPosition = source.indexOf('id="board-of-advisors"');
  assert.ok(boardPosition > source.indexOf('id="leadership-team"'));
  assert.match(source, /name: "Alexis Lecanuet"[\s\S]{0,180}title: "Former Regional CEO, Accenture Middle East"/);
  assert.match(source, /name: "Rami Aslan"/);
  assert.match(source, /name: "Fadi Mattar"/);
});

test("retains Gökhan as a disabled fallback and uses one source-free profile pattern", async () => {
  const source = await readFile(new URL("src/pages/AboutPeople.tsx", websiteRoot), "utf8");
  const gokhan = source.slice(source.indexOf('name: "Gökhan Güney"'), source.indexOf('name: "Alexis Lecanuet"'));

  assert.match(gokhan, /enabled: false/);
  assert.match(source, /function ProfileList/);
  assert.match(source, /<ProfileList profiles=\{leadership\}/);
  assert.match(source, /<ProfileList profiles=\{advisors\}/);
  assert.doesNotMatch(source, /\bsource(?:s)?\b|accessed August|Profile per/i);
});

test("redirects the legacy advisors route without advertising it", async () => {
  const [app, shell, sitemap, publicSitemap] = await Promise.all([
    readFile(new URL("src/App.tsx", websiteRoot), "utf8"),
    readFile(new URL("src/components/layout/Shell.tsx", websiteRoot), "utf8"),
    readFile(new URL("public/sitemap.xml", websiteRoot), "utf8"),
    readFile(new URL("src/components/PublicSitemap.tsx", websiteRoot), "utf8"),
  ]);

  assert.match(app, /path="\/advisors"><AnchoredRedirect to="\/about" anchor="board-of-advisors"/);
  assert.match(app, /search \? `\?\$\{search\}` : ""\}#\$\{anchor\}/);
  assert.doesNotMatch(shell, /"\/advisors"\s*:/);
  assert.doesNotMatch(shell, /href: "\/advisors"/);
  assert.match(shell, /href: "\/about#board-of-advisors"/);
  assert.doesNotMatch(sitemap, /\/advisors/);
  assert.match(publicSitemap, /pathname !== "\/advisors"/);
});