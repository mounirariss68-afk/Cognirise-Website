import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const adminRoot = new URL("../../", import.meta.url);

test("navigation settings keeps draft, review and publish as exact-version actions", async () => {
  const source = await readFile(new URL("src/pages/NavigationSettings.tsx", adminRoot), "utf8");
  assert.match(source, /hasUnsavedRef/);
  assert.match(source, /requestedMarket !== market/);
  assert.match(source, /Discard unsaved navigation changes and switch edition/);
  assert.match(source, /version: submitted\.version/);
  assert.match(source, /version: exactVersion/);
  assert.match(source, /confirmation: "PUBLISH"/);
  assert.match(source, /Review version/);
  assert.match(source, /Publish version/);
});

test("navigation locale editing keeps the committed query key stable through blank and invalid input", async () => {
  const source = await readFile(new URL("src/pages/NavigationSettings.tsx", adminRoot), "utf8");
  assert.match(source, /const \[localeInput, setLocaleInput\] = useState\("en"\)/);
  assert.match(source, /enabled: normalizeNavigationLocale\(locale\) !== null/);
  assert.match(source, /onBlur=\{commitLocaleInput\}/);
  assert.match(source, /Enter a recognized locale such as en, en-US, or zh-Hant before switching editions/);
  assert.match(source, /value=\{localeInput\}/);
  assert.match(source, /new Intl\.DisplayNames/);
  assert.match(source, /onChange=\{\(event\) => switchMarket\(event\.target\.value\)\}/);
  assert.doesNotMatch(source, /onChange=\{\(event\) => switchEdition\(market, event\.target\.value\.trim\(\) \|\| "en"\)\}/);
});

test("navigation editor uses named page and parent controls instead of raw hierarchy inputs", async () => {
  const source = await readFile(new URL("src/pages/NavigationSettings.tsx", adminRoot), "utf8");
  assert.match(source, /navigationDestinationOptions/);
  assert.match(source, /navigationParentOptions/);
  assert.match(source, /aria-label=\{\`\$\{child\.label\} parent menu\`\}/);
  assert.doesNotMatch(source, /aria-label=\{\`\$\{child\.id\} parent\`\}/);
  assert.doesNotMatch(source, /aria-label=\{\`\$\{group\.id\} order\`\}/);
});
