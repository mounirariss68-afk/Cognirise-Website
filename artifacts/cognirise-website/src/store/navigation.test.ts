import assert from "node:assert/strict";
import test from "node:test";
import {
  getNavigationSnapshot,
  initializeNavigationStore,
  isWebsitePath,
  NAVIGATION_HANDOFF_KEY,
  navigateBack,
  NavigationLedger,
} from "./navigation";

type FakeEvent = {
  type: string;
  arguments?: unknown[];
  state?: unknown;
  stopImmediatePropagation: () => void;
};

type FakeListener = (event: FakeEvent) => void;

type FakeBrowser = {
  browser: {
    location: {
      origin: string;
      pathname: string;
      search: string;
      hash: string;
      href: string;
    };
    history: {
      readonly state: unknown;
      pushState: (state: unknown, unused: string, url?: string | URL | null) => void;
      replaceState: (state: unknown, unused: string, url?: string | URL | null) => void;
      go: (delta: number) => void;
    };
    name: string;
    sessionStorage: {
      getItem: (key: string) => string | null;
      setItem: (key: string, value: string) => void;
      removeItem: (key: string) => void;
    };
    setTimeout: typeof setTimeout;
    addEventListener: (type: string, listener: FakeListener, capture?: boolean) => void;
    removeEventListener: (type: string, listener: FakeListener, capture?: boolean) => void;
  };
  historyEntries: () => ReadonlyArray<{ url: string; state: unknown }>;
  nativeHash: (hash: string) => void;
  dispatch: (type: string, event: FakeEvent) => void;
  requestedDeltas: number[];
  externalAttempted: () => boolean;
  restore: () => void;
};

function createFakeBrowser(
  initialUrl = "/",
  session = new Map<string, string>(),
  name = "",
  referrer = "",
): FakeBrowser {
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const listeners = new Map<string, Array<{ listener: FakeListener; capture: boolean }>>();
  const entries = [{ url: new URL(initialUrl, "https://website.test").href, state: null as unknown }];
  let activeIndex = 0;
  let externalAttempted = false;
  const requestedDeltas: number[] = [];
  const location = {
    origin: "https://website.test",
    pathname: new URL(entries[0].url).pathname,
    search: new URL(entries[0].url).search,
    hash: new URL(entries[0].url).hash,
    href: entries[0].url,
  };

  const updateLocation = (value: string | URL | null | undefined) => {
    const next = new URL(value == null ? location.href : String(value), location.href);
    location.href = next.href;
    location.pathname = next.pathname;
    location.search = next.search;
    location.hash = next.hash;
  };

  const dispatch = (type: string, event: FakeEvent) => {
    let stopped = false;
    const originalStop = event.stopImmediatePropagation;
    event.stopImmediatePropagation = () => {
      stopped = true;
      originalStop();
    };
    const callbacks = [...(listeners.get(type) ?? [])].sort(
      (left, right) => Number(right.capture) - Number(left.capture),
    );
    for (const { listener } of callbacks) {
      if (stopped) break;
      listener(event);
    }
  };
  const emit = (type: string, state?: unknown) => {
    dispatch(type, {
      type,
      state,
      stopImmediatePropagation: () => undefined,
    });
  };

  const history = {
    get state() {
      return entries[activeIndex].state;
    },
    pushState(state: unknown, _unused: string, url?: string | URL | null) {
      const nextUrl = new URL(url == null ? location.href : String(url), location.href).href;
      entries.splice(activeIndex + 1);
      entries.push({ url: nextUrl, state });
      activeIndex = entries.length - 1;
      updateLocation(nextUrl);
    },
    replaceState(state: unknown, _unused: string, url?: string | URL | null) {
      const nextUrl = new URL(url == null ? location.href : String(url), location.href).href;
      entries[activeIndex] = { url: nextUrl, state };
      updateLocation(nextUrl);
    },
    go(delta: number) {
      requestedDeltas.push(delta);
      const nextIndex = activeIndex + delta;
      if (nextIndex < 0 || nextIndex >= entries.length) {
        externalAttempted = true;
        return;
      }
      const previousUrl = entries[activeIndex].url;
      activeIndex = nextIndex;
      updateLocation(entries[activeIndex].url);
      emit("popstate", entries[activeIndex].state);
      if (new URL(previousUrl).hash !== new URL(entries[activeIndex].url).hash) {
        emit("hashchange");
      }
    },
  };

  const browser = {
    location,
    history,
    name,
    sessionStorage: {
      getItem: (key: string) => session.get(key) ?? null,
      setItem: (key: string, value: string) => { session.set(key, value); },
      removeItem: (key: string) => { session.delete(key); },
    },
    setTimeout,
    addEventListener: (type: string, listener: FakeListener, capture = false) => {
      const callbacks = listeners.get(type) ?? [];
      callbacks.push({ listener, capture });
      listeners.set(type, callbacks);
    },
    removeEventListener: (type: string, listener: FakeListener, capture = false) => {
      const callbacks = listeners.get(type) ?? [];
      listeners.set(type, callbacks.filter((candidate) =>
        candidate.listener !== listener || candidate.capture !== capture,
      ));
    },
  };
  Object.defineProperty(globalThis, "window", {
    value: browser,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, "document", {
    value: { referrer },
    configurable: true,
    writable: true,
  });

  return {
    browser,
    historyEntries: () => entries.map((entry) => ({ ...entry })),
    nativeHash: (hash: string) => {
      const next = new URL(location.href);
      next.hash = hash;
      entries.splice(activeIndex + 1);
      entries.push({ url: next.href, state: null });
      activeIndex = entries.length - 1;
      updateLocation(next.href);
      emit("hashchange");
    },
    dispatch,
    requestedDeltas,
    externalAttempted: () => externalAttempted,
    restore: () => {
      if (previousWindow === undefined) {
        delete (globalThis as { window?: Window }).window;
      } else {
        Object.defineProperty(globalThis, "window", {
          value: previousWindow,
          configurable: true,
          writable: true,
        });
      }
      if (previousDocument === undefined) {
        delete (globalThis as { document?: Document }).document;
      } else {
        Object.defineProperty(globalThis, "document", {
          value: previousDocument,
          configurable: true,
          writable: true,
        });
      }
    },
  };
}

test("pathname changes create visits while query and anchor contexts stay local", () => {
  const ledger = new NavigationLedger("tab");
  ledger.bootstrap("/?market=uae", 0, "home");
  ledger.push("/platforms?market=uae#overview", 1);
  ledger.push("/platforms?market=ksa#architecture", 2);

  const snapshot = ledger.snapshot();
  assert.equal(snapshot.visits.length, 2);
  assert.equal(snapshot.current.url, "/platforms?market=ksa#architecture");
  assert.equal(ledger.getBackTarget()?.url, "/?market=uae");
  assert.equal(ledger.getBackTarget()?.delta, -2);
});

test("replace updates a redirect in place instead of adding a loopable visit", () => {
  const ledger = new NavigationLedger("tab");
  ledger.bootstrap("/industries", 0, "industries");
  ledger.push("/work", 1);
  ledger.replace("/industries?market=ksa", 1);

  assert.equal(ledger.snapshot().visits.length, 2);
  assert.equal(ledger.snapshot().current.url, "/industries?market=ksa");
  assert.equal(ledger.getBackTarget()?.url, "/industries");
  assert.equal(ledger.getBackTarget()?.delta, -1);
});

test("traversal follows known history entries without manufacturing a visit", () => {
  const ledger = new NavigationLedger("tab");
  ledger.bootstrap("/", 0, "home");
  const platforms = ledger.push("/platforms", 1);
  ledger.push("/platforms#architecture", 2);
  assert.equal(ledger.traverse(platforms, "/platforms"), true);
  assert.equal(ledger.snapshot().visits.length, 2);
  assert.equal(ledger.snapshot().current.url, "/platforms");
  assert.equal(ledger.getBackTarget()?.url, "/");
});

test("unknown traversal is rejected by the ledger", () => {
  const ledger = new NavigationLedger("tab");
  ledger.bootstrap("/", 0, "home");
  assert.equal(ledger.traverse({
    historyIndex: 4,
    visitId: "other-tab",
    url: "/external",
  }, "/external"), false);
});

test("serialized provenance restores the previous visit after a reload", () => {
  const firstLoad = new NavigationLedger("tab");
  firstLoad.bootstrap("/?market=uae", 0, "home");
  firstLoad.push("/platforms?market=uae", 1);

  const afterReload = new NavigationLedger("tab");
  assert.equal(afterReload.restore(firstLoad.serialize()), true);
  assert.equal(afterReload.snapshot().current.url, "/platforms?market=uae");
  assert.equal(afterReload.getBackTarget()?.url, "/?market=uae");
});

test("observes popstate before an unsaved-work guard compensates with pushState", () => {
  const fake = createFakeBrowser();
  try {
    initializeNavigationStore();
    fake.browser.history.pushState(null, "", "/assessment");
    let safeState = fake.browser.history.state;
    let safeUrl = fake.browser.location.href;
    const nativeReplaceState = fake.browser.history.replaceState;
    fake.browser.history.replaceState = (state, unused, url) => {
      nativeReplaceState(state, unused, url);
      safeState = fake.browser.history.state;
      safeUrl = fake.browser.location.href;
    };
    const guard: FakeListener = (event) => {
      if (fake.browser.location.pathname === new URL(safeUrl).pathname) return;
      event.stopImmediatePropagation();
      fake.browser.history.pushState(safeState, "", safeUrl);
    };
    fake.browser.addEventListener("popstate", guard, true);

    fake.browser.history.go(-1);

    assert.equal(fake.browser.location.pathname, "/assessment");
    assert.deepEqual(getNavigationSnapshot(), {
      canGoBack: true,
      currentUrl: "/assessment",
      previousUrl: "/",
      previousHistoryIndex: 0,
    });

    fake.browser.removeEventListener("popstate", guard, true);
    assert.equal(navigateBack(), true);
    assert.equal(fake.browser.location.pathname, "/");
    assert.deepEqual(fake.requestedDeltas, [-1, -1]);
    assert.equal(fake.externalAttempted(), false);
  } finally {
    fake.restore();
  }
});

test("native same-page anchors retain a physical entry without creating a page visit", () => {
  const fake = createFakeBrowser();
  try {
    initializeNavigationStore();
    fake.browser.history.pushState(null, "", "/first");
    fake.nativeHash("#section");

    assert.deepEqual(getNavigationSnapshot(), {
      canGoBack: true,
      currentUrl: "/first#section",
      previousUrl: "/",
      previousHistoryIndex: 0,
    });
    assert.equal(fake.historyEntries().at(-1)?.state !== null, true);

    // Browser back from the native hash entry delivers popstate/hashchange;
    // neither event may append another physical slot.
    fake.browser.history.go(-1);
    assert.deepEqual(getNavigationSnapshot(), {
      canGoBack: true,
      currentUrl: "/first",
      previousUrl: "/",
      previousHistoryIndex: 0,
    });
    fake.nativeHash("#section");
    assert.equal(navigateBack(), true);
    assert.equal(fake.browser.location.pathname, "/");
    assert.equal(fake.browser.location.hash, "");
    assert.deepEqual(fake.requestedDeltas, [-1, -2]);
    assert.equal(fake.externalAttempted(), false);
  } finally {
    fake.restore();
  }
});

test("back-forward initialization reconciles the active marker, not stale session current", () => {
  const session = new Map<string, string>();
  const firstDocument = createFakeBrowser("/", session);
  let activeEntry: { url: string; state: unknown } | undefined;
  let tabName = "";
  try {
    initializeNavigationStore();
    firstDocument.browser.history.pushState(null, "", "/first");
    firstDocument.browser.history.pushState(null, "", "/second");
    activeEntry = firstDocument.historyEntries()[1];
    tabName = firstDocument.browser.name;
  } finally {
    firstDocument.restore();
  }

  const backForwardDocument = createFakeBrowser("/first", session, tabName);
  try {
    // The active history entry is the first internal page, while persisted
    // session state still describes the second page.
    backForwardDocument.browser.history.replaceState(activeEntry?.state ?? null, "", "/first");
    initializeNavigationStore();
    assert.deepEqual(getNavigationSnapshot(), {
      canGoBack: true,
      currentUrl: "/first",
      previousUrl: "/",
      previousHistoryIndex: 0,
    });
  } finally {
    backForwardDocument.restore();
  }
});

test("same-tab full-document internal links use a one-shot handoff", () => {
  const session = new Map<string, string>();
  const firstDocument = createFakeBrowser("/", session);
  let tabName = "";
  const previousElement = (globalThis as { Element?: typeof Element }).Element;
  class TestElement {
    href = "";
    target = "";
    closest<T>() {
      return this as T;
    }
    hasAttribute() {
      return false;
    }
  }
  try {
    Object.defineProperty(globalThis, "Element", {
      value: TestElement,
      configurable: true,
    });
    initializeNavigationStore();
    firstDocument.browser.history.pushState(null, "", "/first");
    tabName = firstDocument.browser.name;
    const anchor = new TestElement();
    anchor.href = "https://website.test/second";
    firstDocument.dispatch("click", {
      type: "click",
      target: anchor,
      button: 0,
      defaultPrevented: false,
      ctrlKey: false,
      metaKey: false,
      altKey: false,
      shiftKey: false,
      stopImmediatePropagation: () => undefined,
    } as unknown as FakeEvent);
    assert.equal(session.has(NAVIGATION_HANDOFF_KEY), true);
  } finally {
    firstDocument.restore();
    if (previousElement === undefined) {
      delete (globalThis as { Element?: typeof Element }).Element;
    } else {
      Object.defineProperty(globalThis, "Element", {
        value: previousElement,
        configurable: true,
      });
    }
  }

  const nextDocument = createFakeBrowser(
    "/second",
    session,
    tabName,
    "https://website.test/first",
  );
  try {
    initializeNavigationStore();
    assert.deepEqual(getNavigationSnapshot(), {
      canGoBack: true,
      currentUrl: "/second",
      previousUrl: "/first",
      previousHistoryIndex: 1,
    });
    assert.equal(session.has(NAVIGATION_HANDOFF_KEY), false);
  } finally {
    nextDocument.restore();
  }
});

test("a prevented same-tab link clears its pending handoff", async () => {
  const session = new Map<string, string>();
  const fake = createFakeBrowser("/", session);
  const previousElement = (globalThis as { Element?: typeof Element }).Element;
  class TestElement {
    href = "";
    target = "";
    closest<T>() {
      return this as T;
    }
    hasAttribute() {
      return false;
    }
  }
  try {
    Object.defineProperty(globalThis, "Element", {
      value: TestElement,
      configurable: true,
    });
    initializeNavigationStore();
    const anchor = new TestElement();
    anchor.href = "https://website.test/second";
    const click = {
      type: "click",
      target: anchor,
      button: 0,
      defaultPrevented: false,
      ctrlKey: false,
      metaKey: false,
      altKey: false,
      shiftKey: false,
      stopImmediatePropagation: () => undefined,
    } as unknown as FakeEvent & { defaultPrevented: boolean };
    fake.dispatch("click", click);
    assert.equal(session.has(NAVIGATION_HANDOFF_KEY), true);
    const external = new TestElement();
    external.href = "https://external.test/second";
    fake.dispatch("click", {
      type: "click",
      target: external,
      button: 0,
      defaultPrevented: false,
      ctrlKey: false,
      metaKey: false,
      altKey: false,
      shiftKey: false,
      stopImmediatePropagation: () => undefined,
    } as unknown as FakeEvent);
    assert.equal(session.has(NAVIGATION_HANDOFF_KEY), false);
    // The original click may also be cancelled after capture by a later
    // handler; its deferred invalidation must remain harmless.
    click.defaultPrevented = true;
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(session.has(NAVIGATION_HANDOFF_KEY), false);
  } finally {
    fake.restore();
    if (previousElement === undefined) {
      delete (globalThis as { Element?: typeof Element }).Element;
    } else {
      Object.defineProperty(globalThis, "Element", {
        value: previousElement,
        configurable: true,
      });
    }
  }
});

test("direct arrivals do not consume a same-tab handoff without a referrer", () => {
  const session = new Map<string, string>();
  const source = createFakeBrowser("/", session);
  let tabName = "";
  let tabId = "";
  try {
    initializeNavigationStore();
    source.browser.history.pushState(null, "", "/first");
    tabName = source.browser.name;
    tabId = session.get("cognirise-navigation-v1:tab") ?? "";
  } finally {
    source.restore();
  }

  const destination = createFakeBrowser("/second", session, tabName);
  try {
    session.set(NAVIGATION_HANDOFF_KEY, JSON.stringify({
      version: 1,
      tabId,
      fromUrl: "/first",
      toUrl: "/second",
      createdAt: Date.now(),
    }));
    initializeNavigationStore();
    assert.equal(getNavigationSnapshot().canGoBack, false);
    assert.equal(session.has(NAVIGATION_HANDOFF_KEY), false);
  } finally {
    destination.restore();
  }
});

test("an external referrer cannot consume a same-tab handoff", () => {
  const session = new Map<string, string>();
  const source = createFakeBrowser("/", session);
  let tabName = "";
  let tabId = "";
  try {
    initializeNavigationStore();
    source.browser.history.pushState(null, "", "/first");
    tabName = source.browser.name;
    tabId = session.get("cognirise-navigation-v1:tab") ?? "";
  } finally {
    source.restore();
  }

  const destination = createFakeBrowser(
    "/second",
    session,
    tabName,
    "https://external.test/first",
  );
  try {
    session.set(NAVIGATION_HANDOFF_KEY, JSON.stringify({
      version: 1,
      tabId,
      fromUrl: "/first",
      toUrl: "/second",
      createdAt: Date.now(),
    }));
    initializeNavigationStore();
    assert.equal(getNavigationSnapshot().canGoBack, false);
    assert.equal(session.has(NAVIGATION_HANDOFF_KEY), false);
  } finally {
    destination.restore();
  }
});

test("same-origin admin and API paths are outside the website boundary", () => {
  assert.equal(isWebsitePath("/admin"), false);
  assert.equal(isWebsitePath("/admin/navigation"), false);
  assert.equal(isWebsitePath("/api"), false);
  assert.equal(isWebsitePath("/api/public-navigation"), false);
  assert.equal(isWebsitePath("/apiary"), true);
  assert.equal(isWebsitePath("/platforms"), true);

  const fake = createFakeBrowser();
  try {
    initializeNavigationStore();
    fake.browser.history.pushState(null, "", "/admin/navigation");
    assert.equal(getNavigationSnapshot().canGoBack, false);
    fake.browser.history.pushState(null, "", "/api/public-navigation");
    assert.equal(getNavigationSnapshot().canGoBack, false);
  } finally {
    fake.restore();
  }
});