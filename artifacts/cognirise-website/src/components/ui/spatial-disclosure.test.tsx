import test from "node:test";
import assert from "node:assert";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  resolveSpatialDisclosureActiveIndex,
  SpatialDisclosure,
  SpatialDisclosureItem,
  SpatialDisclosureTrigger,
  SpatialDisclosurePanel,
} from "./spatial-disclosure";

test("persistent selection outranks pointer or keyboard preview", () => {
  assert.equal(resolveSpatialDisclosureActiveIndex("selected", "preview"), "selected");
  assert.equal(resolveSpatialDisclosureActiveIndex(null, "preview"), "preview");
  assert.equal(resolveSpatialDisclosureActiveIndex(null, null), null);
});

test("preview can explicitly override a persistent selection for hover-driven panels", () => {
  assert.equal(
    resolveSpatialDisclosureActiveIndex("selected", "preview", true),
    "preview",
  );
  assert.equal(
    resolveSpatialDisclosureActiveIndex("selected", null, true),
    "selected",
  );
});

test("SpatialDisclosure renders correctly on server", () => {
  const html = renderToString(
    <SpatialDisclosure defaultValue="1">
      <SpatialDisclosureItem id="1">
        <SpatialDisclosureTrigger id="1">Trigger 1</SpatialDisclosureTrigger>
        <SpatialDisclosurePanel id="1">Panel 1</SpatialDisclosurePanel>
      </SpatialDisclosureItem>
    </SpatialDisclosure>
  );

  assert.ok(html.includes("Trigger 1"));
  assert.ok(html.includes("Panel 1"));
  assert.ok(html.includes('aria-expanded="true"'));
});

test("editorial mode exposes only the persistent selection as expanded", () => {
  const html = renderToString(
    <SpatialDisclosure defaultValue="2" mode="editorial" orientation="horizontal">
      <SpatialDisclosureItem id="1">
        <SpatialDisclosureTrigger id="1">Trigger 1</SpatialDisclosureTrigger>
        <SpatialDisclosurePanel id="1">Panel 1</SpatialDisclosurePanel>
      </SpatialDisclosureItem>
      <SpatialDisclosureItem id="2">
        <SpatialDisclosureTrigger id="2">Trigger 2</SpatialDisclosureTrigger>
        <SpatialDisclosurePanel id="2">Panel 2</SpatialDisclosurePanel>
      </SpatialDisclosureItem>
    </SpatialDisclosure>
  );

  assert.match(html, /aria-expanded="true"[^>]*>Trigger 2/);
  assert.ok(html.includes("Panel 2"));
  assert.match(html, /aria-hidden="true" inert=""[^>]*>Panel 1/);
});

test("instances namespace overlapping item IDs and their ARIA relationships", () => {
  const html = renderToString(
    <>
      <SpatialDisclosure defaultValue="same">
        <SpatialDisclosureItem id="same">
          <SpatialDisclosureTrigger id="same">First trigger</SpatialDisclosureTrigger>
          <SpatialDisclosurePanel id="same">First panel</SpatialDisclosurePanel>
        </SpatialDisclosureItem>
      </SpatialDisclosure>
      <SpatialDisclosure defaultValue="same">
        <SpatialDisclosureItem id="same">
          <SpatialDisclosureTrigger id="same">Second trigger</SpatialDisclosureTrigger>
          <SpatialDisclosurePanel id="same">Second panel</SpatialDisclosurePanel>
        </SpatialDisclosureItem>
      </SpatialDisclosure>
    </>
  );

  const controls = [...html.matchAll(/aria-controls="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(controls.length, 2);
  assert.equal(new Set(controls).size, 2);
  controls.forEach((id) => assert.ok(html.includes(`id="${id}"`)));
});
