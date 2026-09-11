import assert from "node:assert/strict";
import test from "node:test";
import { computeSha256 } from "./upload-queue";
import {
  UploadQueueEngine,
  type QueueEngineDependencies,
  type QueueStorage,
  type UploadResponse,
} from "./upload-queue-engine";

class MemoryStorage implements QueueStorage {
  readonly values = new Map<string, string>();
  failWrites = false;

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    if (this.failWrites) throw new Error("Quota exceeded");
    this.values.set(key, value);
  }
}

function file(name: string, content = name) {
  return new File([content], name, { type: "image/png" });
}

function response(id: string): UploadResponse {
  return {
    media: { id, objectPath: `objects/${id}` },
    uploadUrl: `https://storage.invalid/${id}`,
    method: "PUT",
    headers: { "x-upload": id },
  };
}

function harness(overrides: Partial<QueueEngineDependencies> = {}, storage = new MemoryStorage(), key = "queue-user") {
  let nextId = 0;
  const calls = {
    request: [] as Array<{ body: Record<string, unknown>; key: string }>,
    renew: [] as string[],
    put: [] as string[],
    finalize: [] as Array<{ id: string; body: Record<string, unknown> }>,
    get: [] as string[],
    errors: [] as string[],
  };
  const dependencies: QueueEngineDependencies = {
    request: async (body, idempotencyKey) => {
      calls.request.push({ body, key: idempotencyKey });
      return response(`media-${idempotencyKey}`);
    },
    renew: async (id) => {
      calls.renew.push(id);
      const { media: _media, ...upload } = response(id);
      return upload;
    },
    put: async (url) => {
      calls.put.push(url);
    },
    finalize: async (id, body) => {
      calls.finalize.push({ id, body });
    },
    get: async (id) => {
      calls.get.push(id);
      return { status: "pending" };
    },
    sha256: async (selected) => computeSha256(selected),
    makeId: () => `key-${++nextId}`,
    ...overrides,
  };
  const engine = new UploadQueueEngine({
    dependencies,
    storage,
    storageKey: key,
    onError: (_item, message) => calls.errors.push(message),
  });
  return { engine, calls, storage, dependencies };
}

async function reviewedItem(engine: UploadQueueEngine, selected = file("one.png")) {
  await engine.addFiles([selected], "website");
  const item = engine.getQueue().at(-1)!;
  engine.updateItem(item.id, { reviewed: true });
  return item.id;
}

test("computeSha256 generates the expected SHA-256", async () => {
  assert.equal(
    await computeSha256(new File(["hello world"], "test.txt", { type: "text/plain" })),
    "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9",
  );
});

test("mixed items fail independently, completed work is not retried, and starts are globally bounded", async () => {
  let activePuts = 0;
  let maximumPuts = 0;
  const attempts = new Map<string, number>();
  const { engine, calls } = harness({
    put: async (url) => {
      activePuts += 1;
      maximumPuts = Math.max(maximumPuts, activePuts);
      await new Promise((resolve) => setTimeout(resolve, 5));
      activePuts -= 1;
      attempts.set(url, (attempts.get(url) ?? 0) + 1);
      if (url.includes("key-2")) throw new Error("broken transfer");
    },
    renew: async (id) => {
      const { media: _media, ...upload } = response(id);
      return upload;
    },
  });
  await engine.addFiles([file("a.png"), file("b.png"), file("c.png")], "website");
  for (const item of engine.getQueue()) engine.updateItem(item.id, { reviewed: true });

  const [first, second, third] = engine.getQueue();
  await Promise.all([
    engine.processItem(first.id),
    engine.processItem(first.id),
    engine.processItem(second.id),
    engine.processItem(third.id),
  ]);

  assert.equal(maximumPuts, 1);
  assert.equal(calls.request.filter((call) => call.key === first.id).length, 1);
  assert.deepEqual(engine.getQueue().map((item) => item.status), ["completed", "error", "completed"]);
  const successfulRequests = calls.request.length;
  await engine.processAll();
  assert.equal(calls.request.length, successfulRequests, "successful and allocated items must not request again");
  assert.equal(engine.getQueue()[0].status, "completed");
  assert.equal(engine.getQueue()[2].status, "completed");
});

test("review is required, edits reset review, and the started snapshot is immutable", async () => {
  let releaseRequest!: () => void;
  const waiting = new Promise<void>((resolve) => { releaseRequest = resolve; });
  const { engine, calls } = harness({
    request: async (body, key) => {
      calls.request.push({ body, key });
      await waiting;
      return response("media-snapshot");
    },
  });
  await engine.addFiles([file("snapshot.png")], "linkedin", "post");
  const id = engine.getQueue()[0].id;
  await engine.processAll();
  assert.equal(engine.getQueue()[0].error, undefined, "bulk processing ignores unreviewed drafts");
  await engine.processItem(id);
  assert.equal(calls.request.length, 0);

  engine.updateItem(id, { altText: "first", reviewed: true });
  engine.updateItem(id, { credit: "editor" });
  assert.equal(engine.getQueue()[0].reviewed, false);
  engine.updateItem(id, { reviewed: true });
  const processing = engine.processItem(id);
  engine.updateItem(id, { altText: "changed after click", reviewed: false });
  assert.equal(engine.getQueue()[0].altText, "first");
  assert.equal(engine.getQueue()[0].started, true);
  releaseRequest();
  await processing;

  assert.equal(calls.request[0].body.checksum, engine.getQueue()[0].originalSha256);
  assert.equal(calls.finalize[0].body.altText, "first");
});

test("invalid metadata preflight remains editable and performs no network work", async () => {
  const { engine, calls } = harness();
  await engine.addFiles([file("invalid.png")], "website");
  const item = engine.getQueue()[0];
  engine.updateItem(item.id, { altText: "a".repeat(301), reviewed: true });

  await engine.processItem(item.id);

  assert.equal(engine.getQueue()[0].started, false);
  assert.equal(engine.getQueue()[0].status, "error");
  assert.match(engine.getQueue()[0].error ?? "", /Alt text.*300/);
  assert.equal(calls.request.length, 0);
  assert.equal(calls.put.length, 0);

  engine.updateItem(item.id, { altText: "Valid alternative", reviewed: true });
  assert.equal(engine.getQueue()[0].altText, "Valid alternative");
  await engine.processItem(item.id);
  assert.equal(engine.getQueue()[0].status, "completed");
});

test("intake metadata and user-scoped persistence remain isolated across tabs/users", async () => {
  const storage = new MemoryStorage();
  const first = harness({}, storage, "queue-user-a");
  await first.engine.addFiles([file("site.png")], "website");
  await first.engine.addFiles([file("social.png")], "linkedin", "header");
  assert.deepEqual(first.engine.getQueue().map((item) => item.collection), ["website", "linkedin"]);
  assert.equal(first.engine.getQueue()[1].linkedinAssetKind, "header");

  const otherUser = harness({}, storage, "queue-user-b");
  assert.equal(otherUser.engine.getQueue().length, 0);
  await otherUser.engine.addFiles([file("other.png")], "website");

  const restoredFirst = harness({}, storage, "queue-user-a");
  assert.deepEqual(restoredFirst.engine.getQueue().map((item) => item.filename), ["site.png", "social.png"]);
  assert.deepEqual(otherUser.engine.getQueue().map((item) => item.filename), ["other.png"]);
});

test("refresh after PUT resumes finalization without a file or another PUT", async () => {
  const storage = new MemoryStorage();
  let finalizeAttempts = 0;
  const original = harness({
    finalize: async () => {
      finalizeAttempts += 1;
      throw new Error("finalize unavailable");
    },
  }, storage);
  const id = await reviewedItem(original.engine);
  await original.engine.processItem(id);
  assert.equal(original.engine.getQueue()[0].putCompleted, true);
  assert.equal(original.calls.put.length, 1);

  const resumed = harness({
    finalize: async () => {
      finalizeAttempts += 1;
    },
  }, storage);
  assert.equal(resumed.engine.getQueue()[0].file, undefined);
  assert.equal(resumed.engine.getQueue()[0].started, true);
  await resumed.engine.processItem(id);
  assert.equal(resumed.calls.put.length, 0);
  assert.equal(resumed.engine.getQueue()[0].status, "completed");
  assert.equal(finalizeAttempts, 2);
});

test("a lost request response retries with the same persistent idempotency key", async () => {
  const keys: string[] = [];
  let first = true;
  const { engine, calls } = harness({
    request: async (_body, key) => {
      keys.push(key);
      if (first) {
        first = false;
        throw new Error("response lost");
      }
      return response("stable-media");
    },
  });
  const id = await reviewedItem(engine);
  await engine.processItem(id);
  assert.equal(engine.getQueue()[0].status, "error");
  await engine.processItem(id);
  assert.deepEqual(keys, [id, id]);
  assert.equal(calls.put.length, 1);
  assert.equal(engine.getQueue()[0].status, "completed");
});

test("finalize response recovery requires matching remote byte identity", async () => {
  let expectedChecksum = "";
  const matching = harness({
    finalize: async () => {
      throw new Error("finalize response lost");
    },
    get: async () => ({
      status: "review",
      checksum: expectedChecksum,
      size: file("recover.png").size,
      objectPath: "promoted/final/media-key-1.png",
    }),
  });
  const matchingId = await reviewedItem(matching.engine, file("recover.png"));
  expectedChecksum = matching.engine.getQueue()[0].originalSha256!;
  await matching.engine.processItem(matchingId);
  assert.equal(matching.engine.getQueue()[0].status, "completed");

  const mismatching = harness({
    finalize: async () => {
      throw new Error("finalize response lost");
    },
    get: async () => ({
      status: "review",
      checksum: "some-other-bytes",
      size: file("recover.png").size,
      objectPath: "promoted/final/media-key-1.png",
    }),
  });
  const mismatchingId = await reviewedItem(mismatching.engine, file("recover.png"));
  await mismatching.engine.processItem(mismatchingId);
  assert.equal(mismatching.engine.getQueue()[0].status, "error");
});

test("retry recognizes a finalized matching asset before renewing or duplicating PUT", async () => {
  let putAttempts = 0;
  let expectedChecksum = "";
  const { engine, calls } = harness({
    put: async () => {
      putAttempts += 1;
      throw new Error("client missed PUT result");
    },
    get: async (id) => {
      if (putAttempts < 2) return { id, status: "pending" };
      return {
        id,
        status: "review",
        checksum: expectedChecksum,
        size: file("boundary.png").size,
        objectPath: "promoted/final/boundary.png",
      };
    },
  });
  const id = await reviewedItem(engine, file("boundary.png"));
  expectedChecksum = engine.getQueue()[0].originalSha256!;
  await engine.processItem(id);
  assert.equal(engine.getQueue()[0].status, "error");
  assert.equal(putAttempts, 2);

  await engine.processItem(id);
  assert.equal(engine.getQueue()[0].status, "completed");
  assert.equal(putAttempts, 2);
  assert.equal(calls.renew.length, 1, "only the failed PUT's immediate retry renews");
  assert.equal(calls.finalize.length, 0);
});

test("an expired signed URL is renewed once and signed URLs are never persisted", async () => {
  let putAttempt = 0;
  const storage = new MemoryStorage();
  const { engine, calls } = harness({
    put: async (url) => {
      calls.put.push(url);
      putAttempt += 1;
      if (putAttempt === 1) throw new Error("signature expired");
    },
  }, storage);
  const id = await reviewedItem(engine);
  await engine.processItem(id);
  assert.equal(calls.renew.length, 1);
  assert.equal(engine.getQueue()[0].status, "completed");
  const saved = storage.values.get("queue-user")!;
  assert.equal(saved.includes("storage.invalid"), false);
  assert.equal(saved.includes("x-upload"), false);
});

test("reattachment requires the exact original bytes", async () => {
  const storage = new MemoryStorage();
  const first = harness({}, storage);
  const id = await reviewedItem(first.engine, file("same.png", "original"));
  const restored = harness({}, storage);
  assert.equal(await restored.engine.reattachFile(id, file("same.png", "different")), false);
  assert.equal(restored.engine.getQueue()[0].file, undefined);
  assert.equal(await restored.engine.reattachFile(id, file("renamed.png", "original")), true);
});

test("storage quota failures are visible and prevent any network request", async () => {
  const storage = new MemoryStorage();
  const { engine, calls } = harness({}, storage);
  await engine.addFiles([file("quota.png")], "website");
  const id = engine.getQueue()[0].id;
  engine.updateItem(id, { reviewed: true });
  storage.failWrites = true;
  await engine.processItem(id);
  assert.match(engine.getPersistenceError() ?? "", /Quota exceeded/);
  assert.match(engine.getQueue()[0].error ?? "", /Upload was not started/);
  assert.equal(engine.getQueue()[0].started, false);
  assert.equal(calls.request.length, 0);
});

test("storage failure during a retry preserves the started metadata lock", async () => {
  const storage = new MemoryStorage();
  let requestAttempts = 0;
  const { engine } = harness({
    request: async () => {
      requestAttempts += 1;
      throw new Error("request response lost");
    },
  }, storage);
  const id = await reviewedItem(engine, file("frozen.png"));
  engine.updateItem(id, { altText: "frozen snapshot", reviewed: true });
  await engine.processItem(id);
  assert.equal(engine.getQueue()[0].started, true);

  storage.failWrites = true;
  await engine.processItem(id);
  assert.equal(requestAttempts, 1, "retry must not reach the network without durable state");
  assert.equal(engine.getQueue()[0].started, true);
  engine.updateItem(id, { altText: "unsafe mutation" });
  assert.equal(engine.getQueue()[0].altText, "frozen snapshot");
});