import assert from "node:assert/strict";
import test from "node:test";
import {
  changeRichBlockType,
  removeRichBlock,
  updateRichBlock,
} from "./rich-block-model.ts";

test("rich blocks round-trip exact multiline text, list style, punctuation, and quote attribution", () => {
  const original = [
    { type: "paragraph", text: "Keep this colon: semicolon; and\nline break." },
    { type: "heading", level: 3 as const, text: "An H3 heading" },
    { type: "list", style: "numbered" as const, items: ["First; item\nwith a line", "Second: item"] },
    { type: "quote", text: "A quoted\nmultiline value.", attribution: "A. Editor" },
  ];
  const edited = updateRichBlock(original, 0, {
    ...original[0],
    text: "Keep this colon: semicolon; and\nline break!",
  });

  assert.deepEqual(edited.slice(1), original.slice(1));
  assert.equal(edited[0]?.text, "Keep this colon: semicolon; and\nline break!");
  assert.equal(edited[2]?.style, "numbered");
  assert.deepEqual(edited[2]?.items, ["First; item\nwith a line", "Second: item"]);
  assert.equal(edited[3]?.attribution, "A. Editor");
});

test("changing a block type is explicit and does not parse delimiters", () => {
  const source = { type: "paragraph" as const, text: "A: value; still one\nblock" };
  const list = changeRichBlockType(source, "list");
  assert.deepEqual(list, {
    type: "list",
    style: "bullet",
    items: ["A: value; still one\nblock"],
  });
  assert.deepEqual(changeRichBlockType(list, "quote"), {
    type: "quote",
    text: "A: value; still one\nblock",
  });
});

test("unsupported legacy values stay in place until an explicit removal", () => {
  const legacy = { type: "legacy-html", html: "<p>Do not flatten me</p>" };
  const blocks = [{ type: "paragraph", text: "Current" }, legacy];
  assert.deepEqual(updateRichBlock(blocks, 0, { type: "paragraph", text: "Edited" }), [
    { type: "paragraph", text: "Edited" },
    legacy,
  ]);
  assert.deepEqual(removeRichBlock(blocks, 0), [legacy]);
});