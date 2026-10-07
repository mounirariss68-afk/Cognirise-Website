import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { launchTeam, isPublicTeamProfile, teamHeroForRegion, teamPortraitClipPath } from "./team-launch";

test("compliance hold hides Rami without deleting the saved biography", () => {
  assert.deepEqual(launchTeam.filter(isPublicTeamProfile).map(p => p.name),
    ["Mounir Ariss", "Bülent Eğrilmez", "Don Peppers"]);
  assert.ok(launchTeam.find(p => p.name === "Rami Aslan")?.background);
  assert.equal(isPublicTeamProfile({ name: " Rami Aslan " }), false);
});

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
  assert.equal(about.split("clipPath: teamPortraitClipPath(profile.group, index)").length - 1, 2,
    "Photos and initials both use the per-profile irregular frame");
  assert.match(app, /embedsBackInHero[\s\S]*?path === "\/about"/);
  assert.match(about, /launchPublic && market !== "uae" \? teamHeroForRegion\(market\) : governedLeadershipVisual/);
});

test("the two founders and two advisors each have a different irregular frame", () => {
  const frames = ["leadership", "advisor"].flatMap(group =>
    [0, 1].map(index => teamPortraitClipPath(group as "leadership" | "advisor", index)));
  assert.equal(new Set(frames).size, 4);
  for (const frame of frames) assert.match(frame, /^polygon\(/);
});
