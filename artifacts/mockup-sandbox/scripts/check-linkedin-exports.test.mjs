import assert from "node:assert/strict";
import test from "node:test";
import { validateSvgImages } from "./linkedin-export-integrity.mjs";

const expectFailure = (svg, message) => {
  assert.throws(() => validateSvgImages(svg, "fixture.svg"), message);
};

test("rejects an SVG with no Pulse image", () => {
  expectFailure("<svg></svg>", /does not contain an embedded Pulse image/);
});

test("rejects an external mockup-server image", () => {
  expectFailure(
    '<svg><image href="/__mockup/images/cognirise/pulse.jpg"/></svg>',
    /malformed or unsupported embedded image/,
  );
});

test("rejects an empty image data URI", () => {
  expectFailure(
    '<svg><image href="data:image/jpeg;base64,"/></svg>',
    /malformed or unsupported embedded image/,
  );
});

test("rejects corrupt embedded image data", () => {
  expectFailure(
    `<svg><image href="data:image/jpeg;base64,${Buffer.alloc(12_000).toString("base64")}"/></svg>`,
    /invalid JPEG signature/,
  );
});