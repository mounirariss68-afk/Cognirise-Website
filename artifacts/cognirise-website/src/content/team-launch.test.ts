import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { launchTeam, teamHeroForRegion } from "./team-launch";

test("approved roster has complete founders and the two requested advisors", () => {
  assert.deepEqual(launchTeam.map(p => p.name), ["Mounir Ariss", "Bülent Eğrilmez", "Don Peppers", "Rami Aslan"]);
  assert.equal(launchTeam.filter(p => p.group === "advisor").length, 2);
  for (const person of launchTeam) {
    assert.ok(person.background.length > 100);
    assert.ok(person.contribution.length > 100);
  }
  for (const founder of launchTeam.filter(p => p.group === "leadership")) {
    assert.ok(founder.identityImage);
    assert.ok(existsSync(new URL(`../../public${founder.identityImage!.src}`, import.meta.url)));
  }
});

test("Saudi, Türkiye and Europe have distinct existing regional images, with rest-of-world using Europe", () => {
  const paths = ["ksa", "turkiye", "europe"].map(r => teamHeroForRegion(r).src);
  assert.equal(new Set(paths).size, 3);
  for (const path of paths) assert.ok(existsSync(new URL(`../../public${path}`, import.meta.url)));
  assert.equal(teamHeroForRegion("usa").src, teamHeroForRegion("europe").src);
});

test("About owns the embedded Back control and preserves the UAE approved media", () => {
  const about = readFileSync(new URL("../pages/AboutPeople.tsx", import.meta.url), "utf8");
  const app = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
  assert.match(about, /<NavigationBackControl embedded/);
  assert.equal(about.split("[clip-path:polygon(0_0,100%_10%,88%_100%,10%_88%)]").length - 1, 2,
    "Portraits and advisor initials must retain the same approved irregular shape");
  assert.match(app, /embedsBackInHero[\s\S]*?path === "\/about"/);
  assert.match(about, /launchPublic && market !== "uae" \? teamHeroForRegion\(market\) : governedLeadershipVisual/);
});
