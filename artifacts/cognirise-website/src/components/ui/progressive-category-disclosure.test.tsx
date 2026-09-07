import test from "node:test";
import assert from "node:assert";
import React from "react";
import { renderToString } from "react-dom/server";
import { ProgressiveCategoryDisclosure } from "./progressive-category-disclosure";

test("ProgressiveCategoryDisclosure renders initially visible items and a toggle button", () => {
  const categories = [
    { id: "1", label: "Cat 1" },
    { id: "2", label: "Cat 2" },
    { id: "3", label: "Cat 3" },
    { id: "4", label: "Cat 4" },
    { id: "5", label: "Cat 5" },
  ];

  const html = renderToString(
    <ProgressiveCategoryDisclosure categories={categories} initialCount={3} />
  );
  const visibleText = html.replaceAll("<!-- -->", "");

  assert.ok(html.includes("Cat 1"), "Cat 1 should be visible");
  assert.ok(html.includes("Cat 2"), "Cat 2 should be visible");
  assert.ok(html.includes("Cat 3"), "Cat 3 should be visible");
  assert.ok(!html.includes("Cat 4"), "Cat 4 should not be initially visible");
  assert.ok(!html.includes("Cat 5"), "Cat 5 should not be initially visible");
  assert.ok(visibleText.includes("+2"), "Should expose the hidden category count");
  assert.ok(html.includes('aria-expanded="false"'), "Toggle should expose its collapsed state");
});
