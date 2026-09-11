import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { Router } from "wouter";
import { bankingPov } from "@/content/banking";
import { INDUSTRIES } from "@/content/industries";
import { BankingEditorial } from "./BankingEditorial";

const media = [
  ...bankingPov.startingPoints.map((item) => item.image),
  bankingPov.productionReadiness.image,
].map((reference) => ({
  id: reference.mediaId,
  versionId: reference.mediaVersionId,
  url: `/media/${reference.mediaVersionId}.png`,
  mimeType: "image/png",
  width: 1200,
  height: 1200,
  altText: reference.altText,
}));

const view = {
  ...INDUSTRIES[0],
  bankingPov,
  media,
};
const render = () => renderToString(<Router ssrPath="/industries/financial-services"><BankingEditorial view={view} /></Router>);

test("Banking editorial statically exposes the complete banking narrative", () => {
  const html = render().replaceAll("&amp;", "&");

  assert.match(html, new RegExp(bankingPov.hero.eyebrow));
  for (const point of bankingPov.startingPoints) {
    assert.match(html, new RegExp(point.title));
    assert.match(html, new RegExp(point.valueProposition));
  }
  for (const level of bankingPov.adoptionLevels) {
    assert.match(html, new RegExp(level.illustrativeWork[0]));
    assert.match(html, new RegExp(level.decisionBoundary));
  }
  for (const stage of bankingPov.deliveryPath.stages) assert.match(html, new RegExp(stage.stage));
  for (const practice of bankingPov.productionReadiness.practices) assert.match(html, new RegExp(practice));
  for (const journey of bankingPov.voiceBanking.journeys) assert.match(html, new RegExp(journey.title));
  for (const partner of bankingPov.partners) {
    assert.match(html, new RegExp(partner.name));
    assert.match(html, new RegExp(partner.qualification));
  }
  for (const signal of bankingPov.evidenceSignals) assert.match(html, new RegExp(signal.publisher));
});

test("Banking editorial resolves only pinned supporting artwork with fixed dimensions", () => {
  const html = render();
  const artwork = bankingPov.productionReadiness.image;

  assert.match(html, new RegExp(`src="/media/${artwork.mediaVersionId}\\.png"`));
  assert.match(html, new RegExp(`alt="${artwork.altText}"`));
  assert.match(html, /width="1200"/);
  assert.match(html, /height="1200"/);
});