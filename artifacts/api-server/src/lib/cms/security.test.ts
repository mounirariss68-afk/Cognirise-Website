import assert from "node:assert/strict";
import test from "node:test";
import {
  signPreviewToken,
  verifyPreviewToken,
  verifyWebhookSignature,
  isWebhookTimestampFresh,
  previewClaimsMatch,
  isWorkflowAuthorized,
} from "./security";
import { createHmac } from "node:crypto";

const secret = "a-secure-test-key-that-is-at-least-32-characters";

test("preview tokens preserve market and slug and expire", () => {
  const token = signPreviewToken({ market: "ksa", slug: "about-us", routeKind: "about" }, secret, 100, 60);
  assert.deepEqual(
    (({ market, slug }) => ({ market, slug }))(
      verifyPreviewToken(token, [secret], 120)!,
    ),
    { market: "ksa", slug: "about-us" },
  );
  assert.equal(verifyPreviewToken(token, [secret], 160), undefined);
  assert.equal(verifyPreviewToken(token, ["different-secret-that-is-still-long-enough"], 120), undefined);
});

test("preview issue capabilities carry unique nonces for durable one-time consumption", () => {
  const first = signPreviewToken({ market: "uae", slug: "services", routeKind: "service" }, secret, 100, 60);
  const second = signPreviewToken({ market: "uae", slug: "services", routeKind: "service" }, secret, 100, 60);
  assert.notEqual(first, second);
  assert.notEqual(
    verifyPreviewToken(first, [secret], 120)?.nonce,
    verifyPreviewToken(second, [secret], 120)?.nonce,
  );
});

test("webhook verification binds timestamp and exact bytes", () => {
  const body = Buffer.from('{"ok":true}');
  const timestamp = "1700000000";
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.`)
    .update(body)
    .digest("hex");
  assert.equal(verifyWebhookSignature(body, timestamp, `sha256=${signature}`, secret), true);
  assert.equal(verifyWebhookSignature(Buffer.from('{"ok":false}'), timestamp, signature, secret), false);
});

test("expired webhook timestamps reject replay attempts", () => {
  const now = 1_700_000_000_000;
  assert.equal(isWebhookTimestampFresh(String(now / 1000), now), true);
  assert.equal(isWebhookTimestampFresh(String((now - 301_000) / 1000), now), false);
});

test("preview claims cannot authorize a different market or page", () => {
  const claims = verifyPreviewToken(signPreviewToken({ market: "ksa", slug: "services", routeKind: "service" }, secret, 100, 60), [secret], 120);
  assert.equal(previewClaimsMatch(claims, "ksa", "services", "service"), true);
  assert.equal(previewClaimsMatch(claims, "uae", "services", "service"), false);
  assert.equal(previewClaimsMatch(claims, "ksa", "about", "service"), false);
  assert.equal(previewClaimsMatch(claims, "ksa", "services", "platform"), false);
});

test("preview capabilities bind every approved route family", () => {
  for (const routeKind of ["home", "service", "platform", "industry", "caseStudy", "about", "contact", "landing", "legal"] as const) {
    const slug = routeKind === "home" ? "home" : `${routeKind.toLowerCase()}-preview`;
    const claims = verifyPreviewToken(signPreviewToken({ market: "uae", slug, routeKind }, secret, 100, 60), [secret], 120);
    assert.equal(previewClaimsMatch(claims, "uae", slug, routeKind), true);
    assert.equal(previewClaimsMatch(claims, "uae", slug, routeKind === "home" ? "service" : "home"), false);
  }
});

test("workflow authorization requires an exact bearer key", () => {
  assert.equal(isWorkflowAuthorized("Bearer workflow-key", "workflow-key"), true);
  assert.equal(isWorkflowAuthorized("Bearer wrong-key", "workflow-key"), false);
  assert.equal(isWorkflowAuthorized(undefined, "workflow-key"), false);
  assert.equal(isWorkflowAuthorized("Basic workflow-key", "workflow-key"), false);
});