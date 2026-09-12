import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const adminRoot = new URL("../../../", import.meta.url);

test("user administration uses the server-paginated searchable user contract", async () => {
  const page = await readFile(new URL("src/pages/users/UserAdmin.tsx", adminRoot), "utf8");

  assert.match(page, /useListUsers\(listParams/);
  assert.match(page, /search: userSearch\.trim\(\) \|\| undefined/);
  assert.match(page, /role: userRole/);
  assert.match(page, /status: userStatus/);
  assert.match(page, /data\.totalPages/);
  assert.match(page, /setPage\(1\)/);
});

test("user operations lock only the affected record and retain delivery receipts", async () => {
  const page = await readFile(new URL("src/pages/users/UserAdmin.tsx", adminRoot), "utf8");

  assert.match(page, /lockedUsers/);
  assert.match(page, /setUserLock\(userId, true\)/);
  assert.match(page, /finally \{\s+setUserLock\(userId, false\)/);
  assert.match(page, /if \(inviteUser\.isPending\) return/);
  assert.match(page, /if \(resetUserPassword\.isPending\) return/);
  assert.match(page, /deliveryStatus/);
  assert.match(page, /describeDeliveryReceipt/);
});

test("access delivery receipts poll live state and retry with durable request keys", async () => {
  const page = await readFile(new URL("src/pages/users/UserAdmin.tsx", adminRoot), "utf8");

  assert.match(page, /useGetAccessDeliveryStatus/);
  assert.match(page, /refetchInterval: \(query\)/);
  assert.match(page, /useRetryAccessDelivery/);
  assert.match(page, /"Idempotency-Key"/);
  assert.match(page, /inviteUserRequest/);
  assert.match(page, /resetUserPasswordRequest/);
  assert.match(page, /retryAccessDeliveryRequest/);
  assert.match(page, /same idempotency key/);
  assert.match(page, /Live delivery status/);
  assert.match(page, /Invite another user/);
});
