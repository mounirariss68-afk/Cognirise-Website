import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const websiteRoot = new URL("../../", import.meta.url);

test("uses the CMS people collection in API order without a compiled roster", async () => {
  const source = await readFile(new URL("src/pages/AboutPeople.tsx", websiteRoot), "utf8");
  assert.match(source, /useCmsCollection\("person", \[\],/);
  assert.doesNotMatch(source, /\bpeopleFallback\b|\bprofileOrder\b/);
  assert.match(source, /const visiblePeople = peopleQuery\.delivery === "cms" \? peopleQuery\.data : \[\]/);
  assert.doesNotMatch(source, /\.sort\(/);
  assert.match(source, /const leadership = visiblePeople\.filter/);
  assert.match(source, /const advisors = visiblePeople\.filter/);
  assert.match(source, /String\(profiles\.length\)/);
});

test("uses the CMS person title and makes non-CMS delivery explicit", async () => {
  const source = await readFile(new URL("src/pages/AboutPeople.tsx", websiteRoot), "utf8");
  assert.match(source, /const personContent = item\.content as PersonContent/);
  assert.match(source, /name,\s*group:[\s\S]*title: personContent\.title/);
  assert.match(source, /function PeopleDeliveryStatus/);
  assert.match(source, /delivery === "loading"/);
  assert.match(source, /delivery !== "cms"/);
  assert.match(source, /function ProfileList[\s\S]*if \(delivery !== "cms" && delivery !== "intentional-empty"\) return null/);
  assert.match(source, /No \{label.toLowerCase\(\)\} profiles are currently published/);
  assert.match(source, /function ProfileList/);
  assert.match(source, /<ProfileList profiles=\{leadership\}/);
  assert.match(source, /<ProfileList profiles=\{advisors\}/);
  assert.doesNotMatch(source, /\bsource(?:s)?\b|accessed August|Profile per/i);
});

test("retires the advisors destination while retaining the board on Our Team", async () => {
  const [app, shell, aboutPeople, sitemap, publicSitemap] = await Promise.all([
    readFile(new URL("src/App.tsx", websiteRoot), "utf8"),
    readFile(new URL("src/components/layout/Shell.tsx", websiteRoot), "utf8"),
    readFile(new URL("src/pages/AboutPeople.tsx", websiteRoot), "utf8"),
    readFile(new URL("public/sitemap.xml", websiteRoot), "utf8"),
    readFile(new URL("src/components/PublicSitemap.tsx", websiteRoot), "utf8"),
  ]);

  assert.doesNotMatch(app, /path="\/advisors"/);
  assert.match(app, /<Route component=\{NotFound\} \/>/);
  assert.doesNotMatch(shell, /about\.advisors|href: "\/advisors"|href: "\/about#board-of-advisors"/);
  assert.match(shell, /about\.leadership[\s\S]*about\.partners[\s\S]*about\.faq[\s\S]*about\.contact/);
  assert.match(aboutPeople, /id="board-of-advisors"[\s\S]*<ProfileList profiles=\{advisors\}/);
  assert.doesNotMatch(sitemap, /\/advisors/);
  assert.match(publicSitemap, /path !== "\/advisors"/);
  assert.doesNotMatch(publicSitemap, /retiredPaths/);
});
