import assert from "node:assert/strict";
import test from "node:test";
import { releasedInsightHref, selectInsightArticles, type InsightArticleCard } from "./insights-publications";

const article: InsightArticleCard = {
  number: "01",
  title: "A published point of view",
  copy: "An approved summary.",
  topics: ["strategy"],
  url: "/insights/published-point-of-view",
};
const approved = { ...article, url: "/insights/approved-compiled-point-of-view" };

test("uses the approved compiled list only for an unconfigured UAE English collection", () => {
  assert.deepEqual(selectInsightArticles({
    market: "uae",
    locale: "en",
    hasReleaseContext: false,
    isAuthoritative: false,
    delivery: "intentional-empty",
    published: [],
    approvedFallback: [approved],
  }), [approved]);
});

test("does not fall back for configured empty, failed, loading, or released collections", () => {
  for (const state of [
    { isAuthoritative: true, delivery: "intentional-empty", hasReleaseContext: false },
    { isAuthoritative: false, delivery: "api-error", hasReleaseContext: false },
    { isAuthoritative: false, delivery: "loading", hasReleaseContext: false },
    { isAuthoritative: false, delivery: "intentional-empty", hasReleaseContext: true },
  ]) {
    assert.deepEqual(selectInsightArticles({
      market: "uae",
      locale: "en",
      ...state,
      published: [],
      approvedFallback: [approved],
    }), []);
  }
});

test("never leaks the UAE compiled list into another market or locale", () => {
  for (const [market, locale] of [["uk", "en"], ["uae", "ar"]]) {
    assert.deepEqual(selectInsightArticles({
      market,
      locale,
      hasReleaseContext: false,
      isAuthoritative: false,
      delivery: "intentional-empty",
      published: [],
      approvedFallback: [approved],
    }), []);
  }
});

test("article links are limited to URLs represented by available article cards", () => {
  assert.equal(releasedInsightHref(article.url, [article]), article.url);
  assert.equal(releasedInsightHref(approved.url, [article]), undefined);
});