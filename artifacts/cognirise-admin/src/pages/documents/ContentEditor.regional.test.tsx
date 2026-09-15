import assert from "node:assert/strict";
import test from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ContentEditor } from "./ContentEditor";
import { OverridesContext } from "./OverridesContext";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

function renderOffice(canEdit: boolean, publicationErrors: string[] = []) {
  return renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      <OverridesContext.Provider value={{
        isAdapted: true, canEdit, operations: [{ op: "set", path: "content.address", value: "Local address" }],
        onReset: () => {},
      }}>
        <ContentEditor kind="office" value={{ schemaVersion: 1, city: "Local city", address: "Local address" }}
          onChange={() => {}} errors={[]} publicationErrors={publicationErrors} />
      </OverridesContext.Provider>
    </QueryClientProvider>,
  );
}

test("regional office address exposes a field-specific shared restoration control", () => {
  const html = renderOffice(true);
  assert.match(html, /Restore Full postal address to shared content/);
  assert.match(html, /Local address/);
  assert.doesNotMatch(html, /Restore City to shared content/);
});

test("read-only regional fields cannot restore content", () => {
  const html = renderOffice(false);
  assert.match(html, /disabled=""[^>]*aria-label="Restore Full postal address to shared content"/);
});

test("publication validation appears beside the field without becoming a draft-save error", () => {
  const html = renderOffice(true, ["content.address: Check postal address before publication."]);
  assert.match(html, /aria-invalid="true"/);
  assert.match(html, /Check postal address before publication/);
  assert.doesNotMatch(html, /need attention before saving/);
});