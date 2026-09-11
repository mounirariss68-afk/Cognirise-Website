import assert from "node:assert/strict";
import test from "node:test";

test("navigation patch rejects grandchild outcomes before writing", { concurrency: false }, async (t) => {
  const priorDatabaseUrl = process.env.DATABASE_URL;
  const priorSessionSecret = process.env.SESSION_SECRET;
  process.env.DATABASE_URL = "postgres://test.invalid/cognirise";
  process.env.SESSION_SECRET = "navigation-test-session-secret-that-is-longer-than-32-chars";

  const [{ default: app }, { pool }, auth, security] = await Promise.all([
    import("../src/app.ts"),
    import("@workspace/db"),
    import("../src/lib/auth.ts"),
    import("../src/lib/security.ts"),
  ]);
  const now = new Date();
  let existingRows: Array<Record<string, unknown>> = [];
  let writes = 0;
  const client = {
    query: async (sql: unknown) => {
      const statement = String(sql);
      if (statement.includes("SELECT item_id,label,parent_id")) {
        return { rowCount: existingRows.length, rows: existingRows };
      }
      if (statement.includes("INSERT INTO") || statement.includes("UPDATE ")) writes += 1;
      return { rowCount: 0, rows: [] };
    },
    release: () => undefined,
  };
  t.mock.method(pool, "connect", async () => client as never);
  t.mock.method(pool, "query", async (sql: unknown) => {
    if (String(sql).includes("FROM cms_sessions s")) {
      return {
        rowCount: 1,
        rows: [{
          id: "session-id",
          token_digest: security.hashToken("session-token"),
          mfa_satisfied_at: now,
          expires_at: new Date(now.getTime() + 60_000),
          created_at: now,
          user_id: "user-id",
          name: "Administrator",
          email: "admin@example.com",
          role: "administrator",
          status: "active",
          last_login_at: null,
          user_created_at: now,
          user_updated_at: now,
          must_rotate: false,
          mfa_enabled: true,
          market_codes: [],
        }],
      };
    }
    return { rowCount: 0, rows: [] };
  });

  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  t.after(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => error ? reject(error) : resolve()),
    );
    if (priorDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = priorDatabaseUrl;
    if (priorSessionSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = priorSessionSecret;
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const origin = `http://127.0.0.1:${address.port}`;
  const csrf = auth.csrfForSession(security.hashToken("session-token"));
  const headers = {
    "content-type": "application/json",
    origin,
    "x-csrf-token": csrf,
    cookie: `${auth.SESSION_COOKIE}=session-token; ${auth.CSRF_COOKIE}=${csrf}`,
  };
  const patch = {
    market: "uae",
    locale: "en",
    pages: [],
    items: [{
      id: "platforms",
      label: "Platforms",
      parentId: "what-we-do",
      order: 2,
      destination: "/platforms",
      visible: true,
    }],
  };

  for (const rows of [
    [],
    [{
      item_id: "platforms.cognios",
      label: "CogniOS",
      parent_id: "platforms",
      sort_order: 3,
      destination: "/platforms/cognios",
      visible: true,
      workflow_state: "approved",
    }],
  ]) {
    existingRows = rows;
    writes = 0;
    const response = await fetch(`${origin}/api/navigation`, {
      method: "PUT",
      headers,
      body: JSON.stringify(patch),
    });
    assert.equal(response.status, 400);
    assert.match(JSON.stringify(await response.json()), /submenu cannot be nested/i);
    assert.equal(writes, 0);
  }
});

test("explicit null promotion survives save, reload, review, and publish", { concurrency: false }, async (t) => {
  const priorDatabaseUrl = process.env.DATABASE_URL;
  const priorSessionSecret = process.env.SESSION_SECRET;
  process.env.DATABASE_URL = "postgres://test.invalid/cognirise";
  process.env.SESSION_SECRET = "navigation-journey-secret-that-is-longer-than-32-chars";
  const [{ default: app }, { pool }, auth, security] = await Promise.all([
    import("../src/app.ts"), import("@workspace/db"), import("../src/lib/auth.ts"), import("../src/lib/security.ts"),
  ]);
  const now = new Date();
  const rows = new Map<string, Record<string, unknown>>();
  const pageRows = new Map<string, Record<string, unknown>>();
  let publishedItems: Array<Record<string, unknown>> | null = null;
  let publishedPages: Array<Record<string, unknown>> | null = null;
  const client = {
    query: async (sql: unknown, values: unknown[] = []) => {
      const statement = String(sql);
      if (statement.includes("SELECT item_id,label,parent_id") && statement.includes("ORDER BY")) {
        const values = [...rows.values()];
        return { rowCount: values.length, rows: values };
      }
      if (statement.includes("SELECT item_id,label,parent_id")) {
        const values = [...rows.values()];
        return { rowCount: values.length, rows: values };
      }
      if (statement.includes("INSERT INTO cms_navigation_editions")) {
        rows.set(String(values[2]), {
          item_id: values[2], label: values[3], parent_id: values[4],
          sort_order: values[5], destination: values[6], visible: values[7],
          workflow_state: "draft", updated_at: now,
        });
      }
      if (statement.includes("SELECT path,enabled,workflow_state")) {
        const values = [...pageRows.values()];
        return { rowCount: values.length, rows: values };
      }
      if (statement.includes("INSERT INTO cms_page_availability")) {
        pageRows.set(String(values[2]), {
          path: values[2], enabled: values[3], workflow_state: "draft", updated_at: now,
        });
      }
      if (statement.includes("SET workflow_state='in-review'")) {
        for (const row of rows.values()) if (row.workflow_state === "draft") row.workflow_state = "in-review";
        for (const row of pageRows.values()) if (row.workflow_state === "draft") row.workflow_state = "in-review";
      }
      if (statement.includes("cms_navigation_published_policies") && statement.includes("SELECT")) {
        return publishedItems
          ? { rowCount: 1, rows: [{ items: publishedItems, pages: publishedPages }] }
          : { rowCount: 0, rows: [] };
      }
      if (statement.includes("cms_navigation_published_policies") && statement.includes("INSERT")) {
        publishedItems = JSON.parse(String(values[2]));
        publishedPages = JSON.parse(String(values[3]));
      }
      if (statement.includes("SET workflow_state='approved'")) {
        for (const row of rows.values()) {
          if (row.workflow_state === "in-review" && row.item_id !== "work") row.workflow_state = "approved";
        }
        for (const row of pageRows.values()) {
          if (row.workflow_state === "in-review" && row.path !== "/work" && row.path !== "/work/") {
            row.workflow_state = "approved";
          }
        }
      }
      return { rowCount: 0, rows: [] };
    },
    release: () => undefined,
  };
  t.mock.method(pool, "connect", async () => client as never);
  t.mock.method(pool, "query", async (sql: unknown) => {
    const statement = String(sql);
    if (statement.includes("FROM cms_sessions s")) {
      return { rowCount: 1, rows: [{
        id: "session-id", token_digest: security.hashToken("session-token"),
        mfa_satisfied_at: now, expires_at: new Date(now.getTime() + 60_000), created_at: now,
        user_id: "user-id", name: "Administrator", email: "admin@example.com",
        role: "administrator", status: "active", last_login_at: null,
        user_created_at: now, user_updated_at: now, must_rotate: false,
        mfa_enabled: true, market_codes: [],
      }] };
    }
    if (statement.includes("FROM market_editions")) {
      return { rowCount: 1, rows: [{
        code: "uae", default_locale: "en", fallback_market_code: null,
        fallback_locale: null, is_canonical: true,
      }] };
    }
    if (statement.includes("cms_navigation_published_policies") && statement.includes("SELECT")) {
      return publishedItems
        ? { rowCount: 1, rows: [{ items: publishedItems, pages: publishedPages, published_at: now }] }
        : { rowCount: 0, rows: [] };
    }
    if (statement.includes("FROM cms_navigation_editions")) {
      const values = [...rows.values()];
      return { rowCount: values.length, rows: values };
    }
    if (statement.includes("FROM cms_page_availability")) {
      const values = [...pageRows.values()];
      return { rowCount: values.length, rows: values };
    }
    return { rowCount: 0, rows: [] };
  });

  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  t.after(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    if (priorDatabaseUrl === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = priorDatabaseUrl;
    if (priorSessionSecret === undefined) delete process.env.SESSION_SECRET; else process.env.SESSION_SECRET = priorSessionSecret;
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const origin = `http://127.0.0.1:${address.port}`;
  const csrf = auth.csrfForSession(security.hashToken("session-token"));
  const headers = {
    "content-type": "application/json", origin, "x-csrf-token": csrf,
    cookie: `${auth.SESSION_COOKIE}=session-token; ${auth.CSRF_COOKIE}=${csrf}`,
  };
  const promoted = (body: unknown) => {
    const items = (body as { items: Array<{ id: string; parentId: string | null }> }).items;
    assert.equal(items.find((item) => item.id === "platforms.cognios")?.parentId, null);
  };
  const save = await fetch(`${origin}/api/navigation`, {
    method: "PUT", headers,
    body: JSON.stringify({
      market: "uae", locale: "en", pages: [{ path: "/platforms/cognios", enabled: false }],
      items: [{
        id: "platforms.cognios", label: "Custom CogniOS", parentId: null, order: 2,
        destination: "/platforms/cognios", visible: false,
      }],
    }),
  });
  assert.equal(save.status, 200);
  promoted(await save.json());

  const reload = await fetch(`${origin}/api/navigation?market=uae&locale=en`, { headers });
  assert.equal(reload.status, 200);
  promoted(await reload.json());

  const review = await fetch(`${origin}/api/navigation/review`, {
    method: "POST", headers, body: JSON.stringify({ market: "uae", locale: "en" }),
  });
  assert.equal(review.status, 200);
  promoted(await review.json());

  const publish = await fetch(`${origin}/api/navigation/publish`, {
    method: "POST", headers, body: JSON.stringify({ market: "uae", locale: "en" }),
  });
  assert.equal(publish.status, 200);
  promoted(await publish.json());
  assert.equal(publishedItems?.find((item) => item.id === "platforms.cognios")?.parentId, null);
  assert.equal(publishedPages?.find((page) => page.path === "/platforms/cognios")?.enabled, false);

  const pageOnlySave = await fetch(`${origin}/api/navigation`, {
    method: "PUT", headers,
    body: JSON.stringify({
      market: "uae", locale: "en", items: [],
      pages: [{ path: "/faq", enabled: false }],
    }),
  });
  assert.equal(pageOnlySave.status, 200);
  const pageOnlyReview = await fetch(`${origin}/api/navigation/review`, {
    method: "POST", headers, body: JSON.stringify({ market: "uae", locale: "en" }),
  });
  assert.equal(pageOnlyReview.status, 200);
  const pageOnlyPublish = await fetch(`${origin}/api/navigation/publish`, {
    method: "POST", headers, body: JSON.stringify({ market: "uae", locale: "en" }),
  });
  assert.equal(pageOnlyPublish.status, 200);
  assert.equal(publishedPages?.find((page) => page.path === "/faq")?.enabled, false);

  // A snapshot from before the retirement may still contain Work. Publishing
  // an unrelated approved change must reconcile that legacy record without
  // reverting the already-published settings.
  publishedItems = [
    ...(publishedItems ?? []),
    {
      id: "work", label: "Legacy Work", parentId: null, order: 30,
      destination: "/work", visible: true,
    },
  ];
  publishedPages = [
    ...(publishedPages ?? []),
    { path: "/work", enabled: false },
  ];
  const secondSave = await fetch(`${origin}/api/navigation`, {
    method: "PUT", headers,
    body: JSON.stringify({
      market: "uae", locale: "en", pages: [],
      items: [{
        id: "about", label: "Reviewed about", parentId: null, order: 30,
        destination: "/about", visible: true,
      }],
    }),
  });
  assert.equal(secondSave.status, 200);
  const secondReview = await fetch(`${origin}/api/navigation/review`, {
    method: "POST", headers, body: JSON.stringify({ market: "uae", locale: "en" }),
  });
  assert.equal(secondReview.status, 200);
  rows.set("insights", {
    item_id: "insights", label: "Unreviewed insights", parent_id: null, sort_order: 31,
    destination: "/insights", visible: false, workflow_state: "draft", updated_at: now,
  });
  rows.set("work", {
    item_id: "work", label: "Legacy reviewed Work", parent_id: null, sort_order: 32,
    destination: "/work", visible: true, workflow_state: "in-review", updated_at: now,
  });
  const secondPublish = await fetch(`${origin}/api/navigation/publish`, {
    method: "POST", headers, body: JSON.stringify({ market: "uae", locale: "en" }),
  });
  assert.equal(secondPublish.status, 200);
  await secondPublish.json();
  const liveResponse = await fetch(`${origin}/api/public/navigation?market=uae&locale=en`);
  assert.equal(liveResponse.status, 200);
  const secondBody = await liveResponse.json() as {
    items: Array<{ id: string; label: string; parentId: string | null; visible: boolean }>;
    pages: Array<{ path: string; enabled: boolean }>;
  };
  const stillCustom = secondBody.items.find((item) => item.id === "platforms.cognios");
  assert.deepEqual(
    { label: stillCustom?.label, parentId: stillCustom?.parentId, visible: stillCustom?.visible },
    { label: "Custom CogniOS", parentId: null, visible: false },
  );
  assert.equal(secondBody.pages.find((page) => page.path === "/platforms/cognios")?.enabled, false);
  assert.equal(secondBody.pages.find((page) => page.path === "/faq")?.enabled, false);
  assert.equal(secondBody.pages.some((page) => page.path === "/work"), false);
  assert.equal(secondBody.items.some((item) => item.id === "work"), false);
  assert.equal(secondBody.items.find((item) => item.id === "about")?.label, "Reviewed about");
  assert.equal(secondBody.items.find((item) => item.id === "insights")?.label, "Insights");
});