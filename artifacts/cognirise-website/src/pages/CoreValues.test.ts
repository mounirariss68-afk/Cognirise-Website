import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
test("Core Values generated slots preserve every substantive source paragraph and heading", () => {
  const source = read("../../../../attached_assets/core-values_3_1791360033667.html").split("<main>")[1].split("</main>")[0];
  const inventory = JSON.parse(read("../../../../lib/db/landing-page-inventory.json"));
  const entry = inventory.find((page: { path: string }) => page.path === "/about/core-values");
  assert.ok(entry);
  const normalize = (text: string) => text.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&rarr;/g, "").replace(/\s+/g, " ").trim();
  const slots = entry.snapshot.content.sections.map((slot: { body?: { text: string }[] }) => normalize(slot.body?.map(p => p.text).join(" ") ?? "")).join(" ");
  for (const match of source.matchAll(/<(?:p|h[1-4])\b[^>]*>([\s\S]*?)<\/(?:p|h[1-4])>/g)) {
    const text = normalize(match[1]);
    if (/^\d\d(?: \/ \d\d)?$/.test(text)) continue; // Display ordinals are not editorial slots.
    if (text.startsWith("If we fall short")) continue; // Split native link, tested below.
    for (const part of match[1].split(/<\/?strong>/)) {
      assert.ok(slots.includes(normalize(part)), `Missing source text: ${normalize(part)}`);
    }
  }
  const page = read("./CoreValues.tsx");
  assert.match(page, /href: "\/about"/);
  assert.match(page, /href: "\/contact"/);
  for (const portrait of ["mounir-ariss.jpg", "bulent-egrilmez-20261007.jpg"]) {
    assert.match(page, new RegExp(portrait));
    assert.ok(readFileSync(new URL(`../../public/images/cognirise/people/${portrait}`, import.meta.url)).length > 1000);
  }
});

test("Core Values is registered for public routing and capability-scoped template preview", () => {
  assert.match(read("../App.tsx"), /path="\/about\/core-values"/);
  assert.match(read("./CmsPreview.tsx"), /"\/about\/core-values": CoreValues/);
  assert.match(read("../../../../lib/api-zod/src/navigation.ts"), /id: "about.core-values".*parentId: "about"/);
});
