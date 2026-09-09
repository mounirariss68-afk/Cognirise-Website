import assert from "node:assert/strict";
import test from "node:test";
import { baselineOffices } from "./office-reconciliation";
import { validateCmsSnapshot } from "@workspace/api-zod";

test("baseline offices pass the publish contract with exact confirmed addresses", () => {
  assert.deepEqual(
    baselineOffices.map(({ title, content }) => [title, content.address]),
    [
      ["Dubai", "Office 1914, The Binary by Omniyat, Business Bay, PO Box 71515, Dubai, UAE"],
      ["Riyadh", "Office 27, First Floor, 3483 Anas Bin Malik Road, Riyadh, Kingdom of Saudi Arabia"],
      ["London", "The City, United Kingdom"],
    ],
  );
  for (const office of baselineOffices) {
    const result = validateCmsSnapshot("office", {
      slug: office.slug,
      title: office.title,
      summary: null,
      content: office.content,
      seo: { noIndex: true },
      mediaIds: [],
      markets: ["uae"],
    }, "publish");
    assert.equal(result.success, true);
  }
});