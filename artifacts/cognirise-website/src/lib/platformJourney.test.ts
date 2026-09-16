import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("registers canonical detail routes before the generic route and preserves retired bookmarks", async () => {
  const app = await readFile(new URL("../App.tsx", import.meta.url), "utf8");
  for (const path of [
    "/platforms/cognios", "/platforms/cogniagents", "/platforms/cognidocs",
    "/platforms/cognibase", "/platforms/lupitor", "/platforms/datatoolpack", "/platforms/bunjee-ai",
  ]) {
    assert.ok(app.indexOf(`path="${path}"`) > -1, `${path} is not registered`);
    assert.ok(app.indexOf(`path="${path}"`) < app.indexOf('path="/platforms/:slug"'), `${path} must precede the generic route`);
  }
  assert.match(app, /path="\/platforms\/cognitalk"><CanonicalRedirect to="\/platforms\/lupitor"/);
  assert.match(app, /path="\/platforms\/cogniware"><CanonicalRedirect to="\/platforms\/cognibase"/);
  assert.match(app, /path="\/cognitalk"><CanonicalRedirect to="\/platforms\/lupitor"/);
  assert.match(app, /path="\/cogniware"><CanonicalRedirect to="\/platforms\/cognibase"/);
});

test("overview cards use full-surface canonical links and canonical metadata uses current names", async () => {
  const [overview, shell, detail] = await Promise.all([
    readFile(new URL("../pages/PlatformsOverview.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/layout/Shell.tsx", import.meta.url), "utf8"),
    readFile(new URL("../pages/CogniBase.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(overview, /platforms\.map/);
  assert.match(overview, /href=\{platform\.href\}/);
  assert.match(overview, /data-testid=\{`link-platform-\$\{platform\.slug\}`\}/);
  assert.match(overview, /focus-visible:ring-2/);
  assert.match(shell, /"\/platforms\/cognibase": \{\s+title: "CogniBase \| Cognirise"/);
  assert.doesNotMatch(shell, /CogniTalk|CogniWare/);
  assert.match(detail, /Products \/ CogniBase/);
});