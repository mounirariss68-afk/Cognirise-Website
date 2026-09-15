import { useSyncExternalStore } from "react";

/**
 * The browser history is shared with other applications and with pages that
 * existed before the website loaded. These state fields identify only entries
 * written by this tab's copy of the website.
 */
export const NAVIGATION_STATE_KEY = "__cogniriseNavigation";
export const NAVIGATION_SESSION_KEY = "cognirise-navigation-v1";
export const NAVIGATION_HANDOFF_KEY = `${NAVIGATION_SESSION_KEY}:handoff`;

const TAB_NAME_PREFIX = "cognirise-navigation:";
const NAVIGATION_VERSION = 1;
const MAX_STORED_ENTRIES = 2_000;
const HANDOFF_TTL_MS = 5_000;
const NON_WEBSITE_ROUTE_PREFIXES = ["/admin", "/api"] as const;
const traversalGuards = new Set<(event: PopStateEvent) => void>();

/** Guards run within the early observer, before router subscribers. */
export function registerNavigationTraversalGuard(guard: (event: PopStateEvent) => void) {
  traversalGuards.add(guard);
  return () => { traversalGuards.delete(guard); };
}

export type NavigationUrl = string;

export type NavigationStateMarker = {
  version: typeof NAVIGATION_VERSION;
  tabId: string;
  visitId: string;
  historyIndex: number;
  url: NavigationUrl;
};

export type NavigationHistoryRecord = {
  historyIndex: number;
  visitId: string;
  url: NavigationUrl;
};

export type NavigationVisit = {
  id: string;
  url: NavigationUrl;
  historyIndex: number;
};

export type NavigationBackTarget = {
  url: NavigationUrl;
  historyIndex: number;
  delta: number;
};

export type NavigationLedgerSnapshot = {
  current: NavigationHistoryRecord;
  visits: readonly NavigationVisit[];
  records: readonly NavigationHistoryRecord[];
};

export type NavigationSnapshot = {
  canGoBack: boolean;
  currentUrl: NavigationUrl | null;
  previousUrl: NavigationUrl | null;
  previousHistoryIndex: number | null;
};

type NavigationHandoff = {
  version: typeof NAVIGATION_VERSION;
  tabId: string;
  fromUrl: NavigationUrl;
  toUrl: NavigationUrl;
  createdAt: number;
};

type SerializedNavigationLedger = {
  version: typeof NAVIGATION_VERSION;
  tabId: string;
  current: NavigationHistoryRecord;
  visits: NavigationVisit[];
  records: NavigationHistoryRecord[];
};

type HistoryMethod = "pushState" | "replaceState";
type HistoryMethodArguments = [state?: unknown, unused?: string, url?: string | URL | null];
type HistoryEvent = Event & { arguments?: ArrayLike<unknown> };
type BrowserWindow = Window & {
  __cogniriseNavigationManager?: NavigationManager;
};

const EMPTY_SNAPSHOT: NavigationSnapshot = {
  canGoBack: false,
  currentUrl: null,
  previousUrl: null,
  previousHistoryIndex: null,
};

function randomId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function pageKey(url: NavigationUrl): string {
  try {
    const parsed = new URL(url, "https://cognirise.invalid");
    // A trailing slash is not a different route in the public router.
    return parsed.pathname.length > 1
      ? parsed.pathname.replace(/\/+$/, "")
      : parsed.pathname;
  } catch {
    return url.split(/[?#]/)[0];
  }
}

/**
 * Same-page fragments and query changes are URL context, not page visits.
 * Keeping this policy in the ledger makes pushState, replaceState, and
 * traversal behave identically.
 */
function isSamePage(left: NavigationUrl, right: NavigationUrl): boolean {
  return pageKey(left) === pageKey(right);
}

export function isWebsitePath(pathname: string): boolean {
  return !NON_WEBSITE_ROUTE_PREFIXES.some((prefix) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function cloneState(state: unknown): Record<string, unknown> {
  if (state && typeof state === "object" && !Array.isArray(state)) {
    return { ...(state as Record<string, unknown>) };
  }
  return {};
}

function markerFromState(state: unknown): NavigationStateMarker | null {
  if (!state || typeof state !== "object" || Array.isArray(state)) return null;
  const candidate = (state as Record<string, unknown>)[NAVIGATION_STATE_KEY];
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return null;
  const marker = candidate as Record<string, unknown>;
  if (
    marker.version !== NAVIGATION_VERSION
    || typeof marker.tabId !== "string"
    || typeof marker.visitId !== "string"
    || typeof marker.historyIndex !== "number"
    || !Number.isInteger(marker.historyIndex)
    || typeof marker.url !== "string"
  ) return null;
  return {
    version: NAVIGATION_VERSION,
    tabId: marker.tabId,
    visitId: marker.visitId,
    historyIndex: marker.historyIndex,
    url: marker.url,
  };
}

/**
 * The ledger is intentionally independent of React and the History API. It
 * is the small, deterministic policy layer used by the browser manager and
 * can be tested without a DOM.
 */
export class NavigationLedger {
  private tabId: string;
  private current: NavigationHistoryRecord | null = null;
  private visits: NavigationVisit[] = [];
  private records = new Map<number, NavigationHistoryRecord>();

  constructor(tabId: string) {
    this.tabId = tabId;
  }

  getTabId() {
    return this.tabId;
  }

  bootstrap(url: NavigationUrl, historyIndex = 0, visitId = randomId("visit")) {
    const record = { historyIndex, visitId, url };
    this.current = record;
    this.visits = [{ id: visitId, url, historyIndex }];
    this.records = new Map([[historyIndex, record]]);
    return record;
  }

  restore(serialized: SerializedNavigationLedger): boolean {
    if (
      serialized.version !== NAVIGATION_VERSION
      || serialized.tabId !== this.tabId
      || !serialized.current
      || !Array.isArray(serialized.visits)
      || !Array.isArray(serialized.records)
    ) return false;

    const visits = serialized.visits.filter((visit) =>
      visit
      && typeof visit.id === "string"
      && typeof visit.url === "string"
      && Number.isInteger(visit.historyIndex),
    );
    const records = serialized.records.filter((record) =>
      record
      && typeof record.visitId === "string"
      && typeof record.url === "string"
      && Number.isInteger(record.historyIndex),
    );
    if (
      typeof serialized.current.visitId !== "string"
      || typeof serialized.current.url !== "string"
      || !Number.isInteger(serialized.current.historyIndex)
      || !visits.some((visit) => visit.id === serialized.current.visitId)
      || !records.some((record) =>
        record.historyIndex === serialized.current.historyIndex
        && record.visitId === serialized.current.visitId,
      )
    ) return false;

    this.current = { ...serialized.current };
    this.visits = visits.map((visit) => ({ ...visit }));
    this.records = new Map(records.map((record) => [record.historyIndex, { ...record }]));
    return true;
  }

  getCurrent(): NavigationHistoryRecord | null {
    return this.current ? { ...this.current } : null;
  }

  /**
   * Add a browser history entry. A pathname change creates a page visit;
   * query/hash-only changes keep the current visit but retain their history
   * entry so browser forward/back still has its normal semantics.
   */
  push(url: NavigationUrl, historyIndex = (this.current?.historyIndex ?? -1) + 1) {
    if (!this.current) return this.bootstrap(url, historyIndex);

    this.records.forEach((record, index) => {
      if (index >= historyIndex) this.records.delete(index);
    });

    const currentVisitIndex = this.visits.findIndex((visit) => visit.id === this.current?.visitId);
    if (currentVisitIndex >= 0) this.visits = this.visits.slice(0, currentVisitIndex + 1);

    const visitId = isSamePage(this.current.url, url)
      ? this.current.visitId
      : randomId("visit");
    if (visitId === this.current.visitId) {
      const currentVisit = this.visits[this.visits.length - 1];
      if (currentVisit) currentVisit.url = url;
    } else {
      this.visits.push({ id: visitId, url, historyIndex });
    }

    const record = { historyIndex, visitId, url };
    this.current = record;
    this.records.set(historyIndex, record);
    return record;
  }

  /**
   * Replacing a URL never adds a page visit. This is what collapses canonical
   * redirects into the visit that initiated them.
   */
  replace(url: NavigationUrl, historyIndex = this.current?.historyIndex ?? 0) {
    if (!this.current) return this.bootstrap(url, historyIndex);
    const currentVisit = this.visits.find((visit) => visit.id === this.current?.visitId);
    if (currentVisit) currentVisit.url = url;
    const record = { historyIndex, visitId: this.current.visitId, url };
    this.current = record;
    this.records.set(historyIndex, record);
    return record;
  }

  traverse(record: NavigationHistoryRecord, url: NavigationUrl) {
    const known = this.records.get(record.historyIndex);
    if (!known || known.visitId !== record.visitId) return false;
    const next = { ...known, url };
    this.current = next;
    this.records.set(next.historyIndex, next);
    const visit = this.visits.find((candidate) => candidate.id === next.visitId);
    if (visit) visit.url = url;
    return true;
  }

  getBackTarget(isAllowed: (url: NavigationUrl) => boolean = () => true): NavigationBackTarget | null {
    if (!this.current) return null;
    const target = [...this.records.values()]
      .filter((record) =>
        record.historyIndex < this.current!.historyIndex
        && record.visitId !== this.current!.visitId,
      )
      .filter((record) => isAllowed(record.url))
      .sort((left, right) => right.historyIndex - left.historyIndex)[0];
    if (!target) return null;
    return {
      url: target.url,
      historyIndex: target.historyIndex,
      delta: target.historyIndex - this.current.historyIndex,
    };
  }

  snapshot(): NavigationLedgerSnapshot {
    const current = this.current ?? this.bootstrap("/", 0);
    return {
      current: { ...current },
      visits: this.visits.map((visit) => ({ ...visit })),
      records: [...this.records.values()]
        .sort((left, right) => left.historyIndex - right.historyIndex)
        .map((record) => ({ ...record })),
    };
  }

  serialize(): SerializedNavigationLedger {
    const snapshot = this.snapshot();
    return {
      version: NAVIGATION_VERSION,
      tabId: this.tabId,
      current: snapshot.current,
      visits: [...snapshot.visits],
      records: [...snapshot.records].slice(-MAX_STORED_ENTRIES),
    };
  }
}

function currentUrl(): NavigationUrl {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function sameOriginUrl(value: string | URL | null | undefined): NavigationUrl | null {
  try {
    const parsed = new URL(value == null ? window.location.href : String(value), window.location.href);
    if (parsed.origin !== window.location.origin || !isWebsitePath(parsed.pathname)) return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

function stateWithMarker(state: unknown, marker: NavigationStateMarker) {
  return {
    ...cloneState(state),
    [NAVIGATION_STATE_KEY]: marker,
  };
}

function readSessionStorage(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSessionStorage(key: string, value: string) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Private browsing and quota-limited contexts can reject session storage.
    // In-memory tracking still protects the current document.
  }
}

function removeSessionStorage(key: string) {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // Storage may be unavailable; the in-memory manager remains authoritative.
  }
}

function readNavigationHandoff(tabId: string): NavigationHandoff | null {
  const raw = readSessionStorage(NAVIGATION_HANDOFF_KEY);
  removeSessionStorage(NAVIGATION_HANDOFF_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const handoff = parsed as NavigationHandoff;
    return handoff.version === NAVIGATION_VERSION
      && handoff.tabId === tabId
      && typeof handoff.fromUrl === "string"
      && typeof handoff.toUrl === "string"
      && Number.isFinite(handoff.createdAt)
      && Date.now() - handoff.createdAt >= 0
      && Date.now() - handoff.createdAt <= HANDOFF_TTL_MS
      ? handoff
      : null;
  } catch {
    return null;
  }
}

function navigationType(): string | null {
  try {
    const entry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    return entry?.type ?? null;
  } catch {
    return null;
  }
}

function sameDocumentContext(left: string, right: string): boolean {
  try {
    const leftUrl = new URL(left, window.location.href);
    const rightUrl = new URL(right, window.location.href);
    return leftUrl.origin === rightUrl.origin
      && leftUrl.pathname === rightUrl.pathname
      && leftUrl.search === rightUrl.search;
  } catch {
    return false;
  }
}

function referrerMatchesHandoff(fromUrl: string): boolean {
  // A missing referrer can be caused by a privacy policy or direct entry. In
  // either case, fail closed rather than turning a stale handoff into Back.
  if (typeof document === "undefined" || !document.referrer) return false;
  try {
    const referrer = new URL(document.referrer);
    if (referrer.origin !== window.location.origin) return false;
    return sameDocumentContext(referrer.href, fromUrl);
  } catch {
    return false;
  }
}

function getTabId(): string {
  const windowName = typeof window.name === "string" ? window.name : "";
  const namedWindow = windowName.startsWith(TAB_NAME_PREFIX)
    ? windowName.slice(TAB_NAME_PREFIX.length)
    : "";
  const storedTabId = readSessionStorage(`${NAVIGATION_SESSION_KEY}:tab`);
  if (namedWindow && namedWindow === storedTabId) return namedWindow;

  // window.name is scoped to a tab and survives reloads, while a duplicated
  // tab starts with a new name even when browsers clone sessionStorage.
  const tabId = randomId("tab");
  try {
    window.name = `${TAB_NAME_PREFIX}${tabId}`;
  } catch {
    // The tab id in sessionStorage is still useful where window.name is locked.
  }
  writeSessionStorage(`${NAVIGATION_SESSION_KEY}:tab`, tabId);
  return tabId;
}

function persistedLedger(tabId: string): SerializedNavigationLedger | null {
  const raw = readSessionStorage(NAVIGATION_SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const candidate = parsed as SerializedNavigationLedger;
    return candidate.tabId === tabId && candidate.version === NAVIGATION_VERSION
      ? candidate
      : null;
  } catch {
    return null;
  }
}

class NavigationManager {
  private readonly tabId: string;
  private readonly ledger: NavigationLedger;
  private readonly listeners = new Set<() => void>();
  private snapshot: NavigationSnapshot = EMPTY_SNAPSHOT;
  private initialized = false;
  private suppressHistoryEvents = false;
  private historyMethodsInstalled = false;
  private historyCallFrames: Array<{ method: HistoryMethod; eventObserved: boolean }> = [];
  private pendingHandoffToken = 0;
  private nativeHistoryMethods: Partial<Record<HistoryMethod, History[HistoryMethod]>> = {};

  constructor() {
    this.tabId = getTabId();
    this.ledger = new NavigationLedger(this.tabId);
  }

  initialize() {
    if (this.initialized || typeof window === "undefined") return;
    this.initialized = true;

    const url = currentUrl();
    const marker = markerFromState(window.history.state);
    const stored = persistedLedger(this.tabId);
    const type = navigationType();
    const handoff = readNavigationHandoff(this.tabId);
    // Browsers expose a navigation timing entry. Keeping the null case
    // restore-friendly also makes embedded/test environments behave like a
    // normal reload without weakening real new-tab detection ("navigate").
    const isReloadOrTraversal = type === null || type === "reload" || type === "back_forward";
    let restored = false;
    if (
      (type === null || type === "navigate")
      && !marker
      && handoff
      && handoff.toUrl === url
      && referrerMatchesHandoff(handoff.fromUrl)
      && stored
      && this.ledger.restore(stored)
      && sameDocumentContext(this.ledger.getCurrent()?.url ?? "", handoff.fromUrl)
    ) {
      // A normal same-tab anchor navigation creates a new document and drops
      // the marker. The short-lived click handoff lets that document append
      // one trusted physical entry without treating a new tab/direct arrival
      // as an internal visit.
      this.ledger.push(url, this.ledger.getCurrent()!.historyIndex + 1);
      restored = true;
    }
    if (
      !restored
      &&
      isReloadOrTraversal
      && marker
      && marker.tabId === this.tabId
      && marker.url === url
      && stored
      && this.ledger.restore(stored)
    ) {
      // sessionStorage describes the last app state, not necessarily the
      // entry the browser selected for a back/forward document navigation.
      // Reconcile against the active history marker before exposing Back.
      restored = this.ledger.traverse(marker, url);
    }

    // A direct, external, or newly opened arrival is deliberately a fresh
    // root even when the browser cloned the opener's sessionStorage.
    if (!restored) {
      this.ledger.bootstrap(url, 0);
      this.writeCurrentMarker();
    } else {
      // Persist the active entry after reconciling a back/forward reload so a
      // subsequent reload cannot regress to the stale stored current entry.
      this.writeMarker(this.ledger.getCurrent()!);
    }

    this.installHistoryObservers();
    this.publish();
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.snapshot;

  getBackTarget() {
    if (!this.initialized) this.initialize();
    const target = this.trustedBackTarget();
    if (!target) return null;
    return target;
  }

  goBack() {
    const target = this.getBackTarget();
    if (!target) return false;
    window.history.go(target.delta);
    return true;
  }

  private installHistoryObservers() {
    if (this.historyMethodsInstalled) return;
    this.historyMethodsInstalled = true;

    // Track the History methods themselves, not wouter's synthetic events:
    // when wouter wraps us later, subscribing to both counts each push twice.
    // Unsaved-work guards use a capture listener and may stop propagation
    // after compensating with pushState. Observe traversal first so that
    // compensation starts from the entry the browser actually selected.
    window.addEventListener("popstate", (event) => {
      this.handlePopState();
      traversalGuards.forEach((guard) => guard(event));
    }, true);
    window.addEventListener("hashchange", () => this.handleHashChange());
    window.addEventListener("click", (event) => this.handleLinkClick(event as MouseEvent), true);

    for (const method of ["pushState", "replaceState"] as const) {
      const original = window.history[method];
      this.nativeHistoryMethods[method] = original;
      const manager = this;
      window.history[method] = function patchedHistoryMethod(
        this: History,
        ...args: HistoryMethodArguments
      ) {
        const frame = { method, eventObserved: false };
        manager.historyCallFrames.push(frame);
        try {
          const result = original.apply(this, args);
          if (!frame.eventObserved && !manager.suppressHistoryEvents) {
            manager.applyMutation(method, args[2]);
          }
          return result;
        } finally {
          manager.historyCallFrames.pop();
        }
      } as History[typeof method];
    }
  }

  private handleHistoryEvent(method: HistoryMethod, event: HistoryEvent) {
    if (this.suppressHistoryEvents) return;
    const frame = [...this.historyCallFrames]
      .reverse()
      .find((candidate) => candidate.method === method);
    if (frame) frame.eventObserved = true;
    const args = event.arguments ? Array.from(event.arguments) : [];
    this.applyMutation(method, args[2] as string | URL | null | undefined);
  }

  private applyMutation(method: HistoryMethod, rawUrl: string | URL | null | undefined) {
    this.clearHandoff();
    const url = sameOriginUrl(rawUrl);
    if (!url) {
      // A same-origin admin/API route is still outside this website's
      // navigation boundary. Do not retain it as a Back target.
      this.ledger.bootstrap(currentUrl(), 0);
      this.writeCurrentMarker();
      this.publish();
      return;
    }
    let record: NavigationHistoryRecord;
    const current = this.ledger.getCurrent();

    // pushState commonly receives a null state from wouter. The current
    // ledger entry is therefore the trusted predecessor; inspecting
    // history.state after the mutation would mistake every normal router push
    // for an external arrival.
    if (current) {
      record = method === "pushState"
        ? this.ledger.push(url)
        : this.ledger.replace(url);
    } else {
      // A foreign state object means this document no longer has a trusted
      // internal provenance chain. Start safely at the new same-origin URL.
      record = this.ledger.bootstrap(url, 0);
    }

    this.writeMarker(record);
    this.publish();
  }

  private handlePopState() {
    this.clearHandoff();
    const url = currentUrl();
    const marker = markerFromState(window.history.state);
    const current = this.ledger.getCurrent();
    const sameCurrentEntry = Boolean(
      current
      && marker
      && marker.tabId === this.tabId
      && marker.historyIndex === current.historyIndex
      && marker.visitId === current.visitId,
    );
    const copiedMarkerAnchor = Boolean(
      sameCurrentEntry
      && marker
      && marker.url !== url
      && isSamePage(current!.url, url),
    );
    if (
      isWebsitePath(new URL(window.location.href).pathname)
      &&
      !copiedMarkerAnchor
      &&
      marker
      && marker.tabId === this.tabId
      && this.ledger.traverse(marker, url)
    ) {
      // This entry already has its marker. Do not replaceState here:
      // wouter emits a synchronous route event for replacement, which can
      // unmount the dirty-work guard before its popstate listener runs.
      writeSessionStorage(NAVIGATION_SESSION_KEY, JSON.stringify(this.ledger.serialize()));
      // React external-store notifications can also synchronously rerender
      // the router. Let all capture guards finish before notifying React.
      // A browser may drain microtasks between event listeners, so use the
      // next task, not queueMicrotask, to run after the complete dispatch.
      window.setTimeout(() => this.publish(), 0);
      return;
    }

    if (
      (!marker || copiedMarkerAnchor)
      && current
      && isWebsitePath(new URL(window.location.href).pathname)
      && isSamePage(current.url, url)
    ) {
      // Some browsers report native same-page anchor traversal as a
      // null-state popstate before hashchange. Treat it as a same-visit
      // physical entry rather than discarding the existing chain.
      const record = this.ledger.push(url, current.historyIndex + 1);
      this.writeMarker(record);
      this.publish();
      return;
    }

    // A pop to an entry owned by another tab/document is treated like a
    // direct arrival. We never expose a control that could traverse outside
    // this trusted chain.
    this.ledger.bootstrap(url, 0);
    this.writeCurrentMarker();
    this.publish();
  }

  private handleHashChange() {
    this.clearHandoff();
    const current = this.ledger.getCurrent();
    const marker = markerFromState(window.history.state);
    const markerIsCurrentEntry = Boolean(
      marker
      && current
      && marker.tabId === this.tabId
      && marker.historyIndex === current.historyIndex
      && marker.visitId === current.visitId
      && marker.url === currentUrl(),
    );
    if (!current) {
      this.ledger.bootstrap(currentUrl(), 0);
    } else if (
      marker
      && marker.tabId === this.tabId
      && marker.historyIndex !== current.historyIndex
      && this.ledger.traverse(marker, currentUrl())
    ) {
      // If hashchange is delivered before popstate, a marker-bearing target
      // identifies a known physical entry. Reconcile to it instead of
      // appending a second synthetic slot.
      this.writeCurrentMarker();
      this.publish();
      return;
    } else if (
      !markerIsCurrentEntry
      && isWebsitePath(new URL(window.location.href).pathname)
      && isSamePage(current.url, currentUrl())
    ) {
      // Native `location.hash` / `<a href="#…">` entries may have null state.
      // They are context changes on the current visit, but still consume one
      // physical history slot.
      this.ledger.push(currentUrl(), current.historyIndex + 1);
    } else {
      this.ledger.replace(currentUrl(), current.historyIndex);
    }
    this.writeCurrentMarker();
    this.publish();
  }

  private clearHandoff() {
    this.pendingHandoffToken += 1;
    removeSessionStorage(NAVIGATION_HANDOFF_KEY);
  }

  private handleLinkClick(event: MouseEvent) {
    if (
      event.defaultPrevented
      || event.button !== 0
      || event.ctrlKey
      || event.metaKey
      || event.altKey
      || event.shiftKey
    ) {
      this.clearHandoff();
      return;
    }
    const target = event.target;
    if (typeof Element === "undefined" || !(target instanceof Element)) {
      this.clearHandoff();
      return;
    }
    const anchor = target.closest<HTMLAnchorElement>("a[href]");
    if (!anchor || anchor.hasAttribute("download")) {
      this.clearHandoff();
      return;
    }
    const targetName = anchor.target.trim().toLowerCase();
    if (targetName && targetName !== "_self") {
      this.clearHandoff();
      return;
    }
    const nextUrl = sameOriginUrl(anchor.href);
    if (!nextUrl) {
      this.clearHandoff();
      return;
    }
    const current = new URL(window.location.href);
    const next = new URL(nextUrl, window.location.href);
    // Hash-only navigation remains in this document and is handled by the
    // hashchange observer; do not leave a stale full-document handoff.
    if (current.pathname === next.pathname && current.search === next.search) {
      this.clearHandoff();
      return;
    }
    const sourceWindow = window;
    const token = ++this.pendingHandoffToken;
    writeSessionStorage(NAVIGATION_HANDOFF_KEY, JSON.stringify({
      version: NAVIGATION_VERSION,
      tabId: this.tabId,
      fromUrl: currentUrl(),
      toUrl: nextUrl,
      createdAt: Date.now(),
    } satisfies NavigationHandoff));
    window.setTimeout(() => {
      // Network navigation can leave the source alive past this timer.
      // Invalidate prevented clicks, not merely slow document loads. TTL and
      // exact same-origin referrer validation reject later direct arrivals.
      if (window !== sourceWindow || this.pendingHandoffToken !== token) return;
      if (event.defaultPrevented) {
        this.clearHandoff();
      }
    }, 0);
  }

  private writeCurrentMarker() {
    const current = this.ledger.getCurrent() ?? this.ledger.bootstrap(currentUrl(), 0);
    this.writeMarker(current);
  }

  private writeMarker(record: NavigationHistoryRecord) {
    const marker: NavigationStateMarker = {
      version: NAVIGATION_VERSION,
      tabId: this.tabId,
      visitId: record.visitId,
      historyIndex: record.historyIndex,
      url: record.url,
    };
    const nextState = stateWithMarker(window.history.state, marker);
    this.suppressHistoryEvents = true;
    try {
      // Bypass wrappers installed later by page-level guards. Marker
      // maintenance is internal bookkeeping and must not update a dirty
      // form's "last safe" URL before that guard handles a traversal.
      const replaceState = this.nativeHistoryMethods.replaceState ?? window.history.replaceState;
      replaceState.call(window.history, nextState, "", record.url);
    } finally {
      this.suppressHistoryEvents = false;
    }

    writeSessionStorage(NAVIGATION_SESSION_KEY, JSON.stringify(this.ledger.serialize()));
  }

  private publish() {
    const current = this.ledger.getCurrent();
    if (!current) {
      this.snapshot = EMPTY_SNAPSHOT;
    } else {
      const target = this.trustedBackTarget();
      this.snapshot = {
        canGoBack: Boolean(target && target.delta < 0 && sameOriginUrl(target.url)),
        currentUrl: current.url,
        previousUrl: target?.url ?? null,
        previousHistoryIndex: target?.historyIndex ?? null,
      };
    }
    this.listeners.forEach((listener) => listener());
  }

  private trustedBackTarget() {
    const target = this.ledger.getBackTarget((url) => Boolean(sameOriginUrl(url)));
    if (!target || target.delta >= 0) return null;
    return target;
  }
}

function getManager(): NavigationManager | null {
  if (typeof window === "undefined") return null;
  const browserWindow = window as BrowserWindow;
  if (!browserWindow.__cogniriseNavigationManager) {
    browserWindow.__cogniriseNavigationManager = new NavigationManager();
  }
  return browserWindow.__cogniriseNavigationManager;
}

/**
 * Call this before mounting the router. It tags the initial entry before
 * wouter (or any route redirect) can mutate browser history.
 */
export function initializeNavigationStore() {
  const manager = getManager();
  manager?.initialize();
}

export function getNavigationSnapshot(): NavigationSnapshot {
  const manager = getManager();
  if (!manager) return EMPTY_SNAPSHOT;
  manager.initialize();
  return manager.getSnapshot();
}

export function navigateBack() {
  return getManager()?.goBack() ?? false;
}

export function useNavigationStore(): NavigationSnapshot & { goBack: () => boolean } {
  const manager = getManager();
  manager?.initialize();
  const snapshot = useSyncExternalStore(
    manager?.subscribe ?? (() => () => {}),
    manager?.getSnapshot ?? (() => EMPTY_SNAPSHOT),
    () => EMPTY_SNAPSHOT,
  );
  return { ...snapshot, goBack: navigateBack };
}

export function serializeNavigationLedger(ledger: NavigationLedger): SerializedNavigationLedger {
  return ledger.serialize();
}

// Module evaluation precedes App's market/router imports. Window-targeted
// popstate listeners must not be allowed to notify React before our guards.
if (typeof window !== "undefined" && window.history && window.location) initializeNavigationStore();