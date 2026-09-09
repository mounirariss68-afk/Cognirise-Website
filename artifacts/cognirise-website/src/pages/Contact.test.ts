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
  assert.match(contact, /phone: office\.phone/);
  assert.match(contact, /office\.phone \? \(/);
  assert.match(contact, /href=\{`tel:\$\{office\.phone\}`\}/);
  assert.doesNotMatch(contact, /OFFICE_LOCATIONS\.dubai\.address/);
  assert.match(cms, /office: true/);
});

test("Contact uses one governed contact email value for its label and mail link", async () => {
  const [contact, cms] = await Promise.all([
    readFile(new URL("src/pages/Contact.tsx", websiteRoot), "utf8"),
    readFile(new URL("src/lib/cms.ts", websiteRoot), "utf8"),
  ]);
  assert.match(contact, /const contactEmail = usePublishedContactEmail\(\)/);
  assert.match(contact, /href=\{`mailto:\$\{contactEmail\}`\}/);
  assert.match(contact, />\{contactEmail\}<\/a>/);
  assert.doesNotMatch(contact, /mailto:hello@cognirise\.ai/);
  assert.match(cms, /COMPILED_CONTACT_EMAIL = "hello@cognirise\.ai"/);
  assert.match(cms, /useGetPublicContactConfiguration/);
});