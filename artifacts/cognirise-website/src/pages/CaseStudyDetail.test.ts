import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./CaseStudyDetail.tsx", import.meta.url), "utf8");
const layout = readFileSync(new URL("../components/work/case-study-ui.tsx", import.meta.url), "utf8");

test("case detail resolves from the collection instead of requesting summary detail endpoints", () => {
  assert.match(source, /useCmsCollection/);
  assert.doesNotMatch(source, /useCmsEntry/);
  assert.match(source, /record\?\.variant === "full"/);
  assert.match(source, /!record \|\| !canRender/);
});

test("case layout renders every supported rich work block and top-level quote", () => {
  assert.match(layout, /block\.type === "heading"/);
  assert.match(layout, /block\.type === "quote"/);
  assert.match(layout, /block\.style === "numbered"/);
  assert.match(layout, /<blockquote/);
  assert.match(layout, /item\.quote/);
});