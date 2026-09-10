import assert from "node:assert/strict";
import test from "node:test";
import { architectureLayers, platformRelationships, platformsForLayer } from "./cognios-architecture";

test("defines one many-to-many platform map across every architecture layer", () => {
  assert.deepEqual(platformRelationships.map(({ name }) => name), [
    "CogniOS", "CogniDocs", "CogniAgents", "CogniTalk", "CogniWare",
    "Lupitor", "Datatoolpack AutoData", "bunjee.ai",
  ]);
  assert.deepEqual(
    platformRelationships.find(({ id }) => id === "cognios")?.layerIds,
    architectureLayers.map(({ id }) => id),
  );
  assert.ok(platformRelationships.every(({ layerIds }) => layerIds.length > 1));
  assert.ok(architectureLayers.every(({ id }) => platformsForLayer(id).length > 1));
});

test("keeps partner contributions explicitly outside Cognirise ownership", () => {
  const partners = platformRelationships.filter(({ ownership }) => ownership === "partner");
  assert.deepEqual(partners.map(({ id }) => id), ["lupitor", "datatoolpack", "bunjee-ai"]);
  assert.ok(partners.every(({ role, contribution }) => role === "partner" && /contribute/i.test(contribution)));
});

test("supports bidirectional layer lookup without exclusive placement", () => {
  assert.deepEqual(
    platformsForLayer("experience").map(({ id }) => id),
    ["cognios", "cognitalk", "lupitor", "bunjee-ai"],
  );
  assert.deepEqual(
    platformsForLayer("integration").map(({ id }) => id),
    ["cognios", "cogniagents", "cogniware", "lupitor", "datatoolpack"],
  );
});