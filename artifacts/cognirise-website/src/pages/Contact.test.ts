import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const websiteRoot = new URL("../../", import.meta.url);

test("Contact renders the ordered published office collection from the CMS", async () => {
  const [contact, cms] = await Promise.all([
    readFile(new URL("src/pages/Contact.tsx", websiteRoot), "utf8"),
    readFile(new URL("src/lib/cms.ts", websiteRoot), "utf8"),
  ]);

  assert.match(contact, /useCmsCollection\("office"/);
  assert.match(contact, /contentRecord\(item, "office"\)/);
  assert.match(contact, /\.toSorted\(\(left, right\) => left\.order - right\.order\)/);
  assert.doesNotMatch(contact, /OFFICE_LOCATIONS\.dubai\.address/);
  assert.match(cms, /office: true/);
});