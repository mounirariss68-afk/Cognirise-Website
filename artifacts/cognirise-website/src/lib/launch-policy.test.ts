import test from "node:test";
import assert from "node:assert/strict";
import { launchHrefAllowed } from "@workspace/api-zod";

test("launch blocks direct, nested, aliased and external partner destinations", () => {
  for (const href of ["/platforms", "/platforms/cognios?market=ksa", "/cognitalk", "/insights", "/insights/article", "/partners", "https://www.argano.com/path", "https://bgts.com", "https://bunjee.ai", "https://lupitor.com", "https://datatoolpack.com", "/%70latforms/cognios", "/%xx"]) {
    assert.equal(launchHrefAllowed(href), false, href);
  }
});
test("launch keeps methodology pathways, contact and industry routes", () => {
  for (const href of ["/", "/methodologies", "/methodologies/idao", "/industries/education", "/about", "/contact", "mailto:support@cognirise.ai"]) {
    assert.equal(launchHrefAllowed(href), true, href);
  }
});
