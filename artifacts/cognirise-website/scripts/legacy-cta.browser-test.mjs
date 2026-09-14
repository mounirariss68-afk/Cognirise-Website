import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { spawn } from "node:child_process";

// Run after the website and API workflows are ready behind the managed proxy.
const baseUrl = process.env.PULSE_BROWSER_BASE_URL || "http://127.0.0.1:80";
const browserPath = process.env.CHROMIUM_PATH || "/repl/tools/bin/chromium";
const debuggingPort = Number(process.env.LEGACY_CTA_DEBUG_PORT || 9389);
const profilePath = `/tmp/cognirise-legacy-cta-${process.pid}`;
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const routes = [
  {
    id: "investment",
    situation: "We need to know where AI is worth investing.",
    actions: [
      ["Frame an opportunity in IDAO", "/methodologies/idao", "primary"],
      ["Compare defined opportunities", "/methodologies/ai-use-case-prioritization", "secondary"],
    ],
  },
  {
    id: "competing-ideas",
    situation: "We have several AI ideas and need to choose.",
    actions: [
      ["Open prioritization", "/methodologies/ai-use-case-prioritization", "primary"],
      ["Review IDAO gates", "/methodologies/idao", "secondary"],
    ],
  },
  {
    id: "existing-strategy",
    situation: "We have an AI strategy and need to implement it.",
    actions: [
      ["Review IDAO delivery entry", "/methodologies/idao", "primary"],
      ["Open a supporting method", "/methodologies/ai-use-case-prioritization", "secondary"],
    ],
  },
  {
    id: "process-problem",
    situation: "We need to improve a specific process.",
    actions: [
      ["Frame the process opportunity", "/methodologies/idao", "primary"],
      ["Open work-design playbook", "/methodologies/human-agent-operating-model", "secondary"],
      ["Assess an agent workflow", "/methodologies/agentic-operations-readiness", "secondary"],
    ],
  },
  {
    id: "pilot-release",
    situation: "We have a pilot and need to put it into everyday use.",
    actions: [
      ["Review the IDAO gate", "/methodologies/idao", "primary"],
      ["Assess agent operating conditions", "/methodologies/agentic-operations-readiness", "secondary"],
      ["Design changed work", "/methodologies/human-agent-operating-model", "secondary"],
    ],
  },
  {
    id: "proven-expansion",
    situation: "AI works in one area. We need to expand it.",
    actions: [
      ["Review expansion through IDAO", "/methodologies/idao", "primary"],
      ["Assess organizational constraints", "/methodologies/ai-value-to-scale", "secondary"],
      ["Compare expansion choices", "/methodologies/ai-use-case-prioritization", "secondary"],
    ],
  },
  {
    id: "underperformance",
    situation: "Our AI is in use, but the results are falling short.",
    actions: [
      ["Review operating evidence in IDAO", "/methodologies/idao", "primary"],
      ["Open work-design playbook", "/methodologies/human-agent-operating-model", "secondary"],
      ["Review organizational constraints", "/methodologies/ai-value-to-scale", "secondary"],
    ],
  },
];

const viewports = [
  { name: "desktop", width: 1440, height: 1000, mobile: false },
  { name: "mobile", width: 390, height: 844, mobile: true },
];

await rm(profilePath, { recursive: true, force: true });
const browser = spawn(browserPath, [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu",
  "--blink-settings=availableHoverTypes=2,primaryHoverType=2,availablePointerTypes=4,primaryPointerType=4",
  `--remote-debugging-port=${debuggingPort}`,
  `--user-data-dir=${profilePath}`,
  "about:blank",
], { stdio: "ignore" });
const browserExited = new Promise((resolve) => browser.once("exit", resolve));
let socket;
let commandId = 0;
const pending = new Map();

try {
  let target;
  for (let attempt = 0; attempt < 60 && !target; attempt += 1) {
    try {
      target = (await fetch(`http://127.0.0.1:${debuggingPort}/json/list`).then((response) => response.json()))
        .find((candidate) => candidate.type === "page");
    } catch {
      // Chromium is still starting.
    }
    if (!target) await delay(100);
  }
  assert.ok(target, "Chromium did not expose a page target.");

  socket = new WebSocket(target.webSocketDebuggerUrl);
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (!message.id || !pending.has(message.id)) return;
    const entry = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) entry.reject(new Error(message.error.message));
    else entry.resolve(message.result);
  };
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });

  function send(method, params = {}) {
    commandId += 1;
    const requestId = commandId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(requestId);
        reject(new Error(`Timed out: ${method}`));
      }, 30000);
      pending.set(requestId, {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });
      socket.send(JSON.stringify({ id: requestId, method, params }));
    });
  }

  async function evaluate(expression) {
    const result = await send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    assert.ok(!result.exceptionDetails, result.exceptionDetails?.exception?.description || result.exceptionDetails?.text);
    return result.result.value;
  }

  async function waitFor(expression, description) {
    for (let attempt = 0; attempt < 120; attempt += 1) {
      if (await evaluate(expression)) return;
      await delay(100);
    }
    throw new Error(description);
  }

  async function setViewport(viewport, reducedMotion) {
    await send("Emulation.setDeviceMetricsOverride", {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 1,
      mobile: viewport.mobile,
    });
    await send("Emulation.setEmulatedMedia", {
      media: "screen",
      features: [
        { name: "prefers-reduced-motion", value: reducedMotion ? "reduce" : "no-preference" },
        { name: "hover", value: viewport.mobile ? "none" : "hover" },
        { name: "pointer", value: viewport.mobile ? "coarse" : "fine" },
      ],
    });
    await send("Emulation.setTouchEmulationEnabled", {
      enabled: viewport.mobile,
      maxTouchPoints: 1,
    });
  }

  async function navigate(pathname, readyExpression) {
    await send("Page.navigate", { url: `${baseUrl}${pathname}` });
    await waitFor(
      `document.readyState === "complete" && location.pathname === ${JSON.stringify(pathname)} && (${readyExpression})`,
      `Route did not become ready: ${pathname}`,
    );
  }

  async function pressKey(key, code, keyCode) {
    const event = {
      type: "keyDown",
      key,
      code,
      windowsVirtualKeyCode: keyCode,
      nativeVirtualKeyCode: keyCode,
    };
    await send("Input.dispatchKeyEvent", event);
    await send("Input.dispatchKeyEvent", { ...event, type: "keyUp" });
  }

  async function pointer(x, y) {
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  }

  async function clickAt(x, y) {
    await pointer(x, y);
    await send("Input.dispatchMouseEvent", {
      type: "mousePressed",
      x,
      y,
      button: "left",
      buttons: 1,
      clickCount: 1,
    });
    await send("Input.dispatchMouseEvent", {
      type: "mouseReleased",
      x,
      y,
      button: "left",
      buttons: 0,
      clickCount: 1,
    });
  }

  const routeActions = '[data-testid="route-actions"]';

  async function inspectRoute(index, expected, viewport, reducedMotion) {
    await evaluate(`document.querySelector('[data-route-index="${index}"]').click(); true`);
    await delay(80);
    const state = await evaluate(`(() => {
      const print = document.querySelector('[data-print-route="${expected.id}"]');
      const panel = document.querySelector("#selected-route-output");
      const rect = (node) => {
        const value = node?.getBoundingClientRect();
        return value ? {
          left: value.left, right: value.right, top: value.top, bottom: value.bottom,
          width: value.width, height: value.height,
        } : null;
      };
      const contained = (inner, outer) => Boolean(
        inner && outer
        && inner.left >= outer.left - 1 && inner.right <= outer.right + 1
        && inner.top >= outer.top - 1 && inner.bottom <= outer.bottom + 1,
      );
      const intersects = (left, right) => Boolean(
        left && right && left.left < right.right && left.right > right.left
        && left.top < right.bottom && left.bottom > right.top,
      );
      const textRect = (label) => {
        const range = document.createRange();
        range.selectNodeContents(label);
        return rect({ getBoundingClientRect: () => range.getBoundingClientRect() });
      };
      const screenLinks = [...panel.querySelectorAll(${JSON.stringify(routeActions + " a")})];
      const inspect = (link) => {
        const linkRect = rect(link);
        const label = link.querySelector(".pulse-action-label");
        const circle = link.querySelector(".pulse-action-icon");
        const labelRect = textRect(label);
        const circleRect = rect(circle);
        const labelStyle = getComputedStyle(label);
        const circleStyle = getComputedStyle(circle);
        return {
          tag: link.tagName,
          text: label?.textContent?.replace(/\\s+/g, " ").trim(),
          href: link.getAttribute("href"),
          classes: [...link.classList],
          sharedStructure: Boolean(
            link.matches("a.pulse-action")
            && link.querySelector(".pulse-action-layout")
            && link.querySelector(".pulse-action-label")
            && link.querySelector(".pulse-action-trail")
            && link.querySelector(".pulse-action-dot")
          ),
          linkRect,
          labelRect,
          circleRect,
          labelOverflow: label.scrollWidth - label.clientWidth,
          labelHeightOverflow: label.scrollHeight - label.clientHeight,
          labelCircleOverlap: intersects(labelRect, circleRect),
          bounded: contained(labelRect, linkRect) && contained(circleRect, linkRect),
          labelTransition: labelStyle.transitionDuration,
          circleTransition: circleStyle.transitionDuration,
        };
      };
      return {
        selected: panel.querySelector('[data-testid="route-detail-situation"]')?.textContent?.replace(/\\s+/g, " ").trim(),
        checked: document.querySelector('[data-route-index="${index}"]')?.getAttribute("aria-checked"),
        screen: screenLinks.map(inspect),
        print: [...(print?.querySelectorAll("a") || [])].map((link) => ({
          text: link.textContent?.replace(/\\s+/g, " ").trim(),
          href: link.getAttribute("href"),
        })),
        reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
        hoverMedia: matchMedia("(hover: hover) and (pointer: fine)").matches,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    })()`);

    const expectedActions = expected.actions.map(([text, href, variant]) => ({ text, href, variant }));
    assert.equal(state.selected, expected.situation, `${viewport.name}/${reducedMotion}: route ${expected.id} situation`);
    assert.equal(state.checked, "true", `${viewport.name}/${reducedMotion}: route ${expected.id} selection`);
    assert.equal(state.screen.length, expectedActions.length, `${viewport.name}/${reducedMotion}: route ${expected.id} action count`);
    assert.deepEqual(
      state.screen.map(({ text, href }) => ({ text, href })),
      expectedActions.map(({ text, href }) => ({ text, href })),
      `${viewport.name}/${reducedMotion}: route ${expected.id} screen actions`,
    );
    assert.deepEqual(state.print, expectedActions.map(({ text, href }) => ({ text, href })),
      `${viewport.name}/${reducedMotion}: route ${expected.id} print actions`);
    assert.ok(state.screen.every((item, actionIndex) =>
      item.tag === "A"
      && item.sharedStructure
      && item.classes.includes("pulse-action")
      && item.classes.includes(`pulse-action-${expectedActions[actionIndex].variant}`)
      && item.bounded
      && item.labelOverflow <= 1
      && item.labelHeightOverflow <= 1
      && !item.labelCircleOverlap,
    ), `${viewport.name}/${reducedMotion}: route ${expected.id} label/circle clipping`);
    assert.ok(state.overflow <= 1, `${viewport.name}/${reducedMotion}: route ${expected.id} horizontal overflow`);
    assert.equal(state.reduced, reducedMotion, `${viewport.name}/${reducedMotion}: reduced-motion media`);

    if (reducedMotion) {
      const reduced = await evaluate(`(() => [...document.querySelectorAll(${JSON.stringify(routeActions + " a")})].map((link) => {
        const rect = link.getBoundingClientRect();
        const icon = link.querySelector(".pulse-action-icon");
        const dot = link.querySelector(".pulse-action-dot");
        const trail = link.querySelector(".pulse-action-trail");
        const number = (value) => Number.parseFloat(value) || 0;
        return {
          iconRight: number(getComputedStyle(icon).left),
          // The shared button has 5px padding and a 1px border; the
          // absolutely positioned icon travels to the content-box edge.
          expectedRight: rect.width - 48,
          dotRotate: number(getComputedStyle(dot).rotate),
          trailRotate: number(getComputedStyle(trail).rotate),
          trailOpacity: number(getComputedStyle(trail).opacity),
          transition: getComputedStyle(link).transitionDuration,
          motion: link.dataset.pulseActionMotion,
        };
      }))()`);
      assert.ok(reduced.every((item) =>
        Math.abs(item.iconRight - item.expectedRight) <= 1
        && item.dotRotate === 0
        && item.trailRotate === 0
        && item.trailOpacity === 0
        && item.transition === "0s"
        && item.motion === "rest",
      ), `${viewport.name}/reduced: route ${expected.id} must stay static`);
    }

    await assertKeyboardFocus(expectedActions, viewport, reducedMotion);
    return state;
  }

  async function assertKeyboardFocus(expectedActions, viewport, reducedMotion) {
    await evaluate(`(() => {
      const actions = document.querySelector(${JSON.stringify(routeActions)});
      const marker = document.createElement("button");
      marker.type = "button";
      marker.id = "legacy-cta-focus-entry";
      marker.textContent = "focus entry";
      marker.style.cssText = "position:absolute; width:1px; height:1px; opacity:0";
      actions.before(marker);
      marker.focus();
    })()`);
    for (let index = 0; index < expectedActions.length; index += 1) {
      await pressKey("Tab", "Tab", 9);
      const focused = await evaluate(`(() => {
        const link = document.querySelector(${JSON.stringify(routeActions + " a:nth-of-type(" + (index + 1) + ")")});
        return {
          active: document.activeElement === link,
          focusVisible: link?.matches(":focus-visible"),
          label: link?.querySelector(".pulse-action-label")?.textContent?.replace(/\\s+/g, " ").trim(),
        };
      })()`);
      assert.equal(focused.active, true, `${viewport.name}/${reducedMotion}: keyboard action ${index} focus`);
      assert.equal(focused.focusVisible, true, `${viewport.name}/${reducedMotion}: keyboard action ${index} focus ring`);
      assert.equal(focused.label, expectedActions[index].text,
        `${viewport.name}/${reducedMotion}: keyboard action ${index} label`);
    }
    await evaluate("document.getElementById('legacy-cta-focus-entry')?.remove(); true");
  }

  async function pulseFrames(selector, duration) {
    return evaluate(`window.__legacyCtaPulseFrames(${JSON.stringify(selector)}, ${duration})`);
  }

  async function assertPointerPulse(variant, context) {
    const selector = `[data-legacy-pulse-probe="${variant}"]`;
    await evaluate(`(() => {
      const link = [...document.querySelectorAll(${JSON.stringify(routeActions + " a")})]
        .find((candidate) => candidate.classList.contains("pulse-action-${variant}"));
      if (!link) throw new Error("Missing ${variant} route action.");
      link.dataset.legacyPulseProbe = "${variant}";
      link.blur();
      link.scrollIntoView({ block: "center", behavior: "instant" });
    })()`);
    await delay(50);
    await pointer(2, 2);
    await delay(80);
    const rest = await evaluate(`(() => {
      const link = document.querySelector(${JSON.stringify(selector)});
      const icon = link.querySelector(".pulse-action-icon");
      const dot = link.querySelector(".pulse-action-dot");
      return {
        left: Number.parseFloat(getComputedStyle(icon).left),
        rotate: Number.parseFloat(getComputedStyle(dot).rotate) || 0,
        width: link.getBoundingClientRect().width,
        hover: link.matches(":hover"),
      };
    })()`);
    assert.equal(rest.hover, false, `${context}/${variant}: pointer starts outside`);

    const point = await evaluate(`(() => {
      const rect = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    })()`);
    const entering = pulseFrames(selector, 1120);
    await pointer(point.x, point.y);
    const enterFrames = await entering;
    assert.ok(await evaluate(`document.querySelector(${JSON.stringify(selector)}).matches(":hover")`),
      `${context}/${variant}: real pointer entered`);
    assert.ok(enterFrames.some((frame) => frame.left > rest.left + 4), `${context}/${variant}: timed circle entry`);
    assert.ok(enterFrames.some((frame) => frame.motion === "moving"), `${context}/${variant}: moving phase`);
    assert.ok(enterFrames.some((frame) => frame.motion === "arriving"), `${context}/${variant}: arrival phase`);
    assert.ok(enterFrames.some((frame) => frame.trailOpacity > 0.1), `${context}/${variant}: coral trail entry`);
    assert.ok(enterFrames.some((frame) => frame.dotRotate < -45), `${context}/${variant}: circle dot entry rotation`);
    const entered = enterFrames.at(-1);
    assert.ok(entered.left >= entered.width - 49, `${context}/${variant}: circle reaches the right edge`);

    const exiting = pulseFrames(selector, 1120);
    await pointer(2, 2);
    const exitFrames = await exiting;
    assert.ok(exitFrames.some((frame) => frame.left < entered.left - 4), `${context}/${variant}: timed circle exit`);
    assert.ok(exitFrames.some((frame) => frame.motion === "moving"), `${context}/${variant}: exit moving phase`);
    assert.ok(exitFrames.some((frame) => frame.motion === "arriving"), `${context}/${variant}: exit arrival phase`);
    assert.ok(exitFrames.some((frame) => frame.trailOpacity > 0.1), `${context}/${variant}: coral trail exit`);
    assert.ok(exitFrames.at(-1).left <= rest.left + 1, `${context}/${variant}: circle returns to the left edge`);
    assert.ok(exitFrames.at(-1).dotRotate > -1, `${context}/${variant}: circle dot returns to rest`);
    await evaluate(`document.querySelector(${JSON.stringify(selector)})?.removeAttribute("data-legacy-pulse-probe"); true`);
  }

  async function assertDestinationClick(expected, variant) {
    await navigate("/methodologies", `document.querySelectorAll("[data-route-index]").length === 7`);
    await evaluate(`document.querySelector('[data-route-index="0"]').click(); window.__legacyCtaAnalytics = []; true`);
    await delay(80);
    const selector = `[data-legacy-analytics-probe="${variant}"]`;
    const destination = expected.actions.find(([, , type]) => type === variant);
    await evaluate(`(() => {
      const link = [...document.querySelectorAll(${JSON.stringify(routeActions + " a")})]
        .find((candidate) => candidate.classList.contains("pulse-action-${variant}"));
      if (!link) throw new Error("Missing ${variant} analytics route action.");
      link.dataset.legacyAnalyticsProbe = "${variant}";
      link.scrollIntoView({ block: "center", behavior: "instant" });
    })()`);
    await delay(50);
    const point = await evaluate(`(() => {
      const rect = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    })()`);
    await clickAt(point.x, point.y);
    await waitFor(
      `location.pathname === ${JSON.stringify(destination[1])}`,
      `Actual ${variant} methodology click did not preserve ${destination[1]}`,
    );
    const analytics = await evaluate(`({
      href: location.pathname,
      events: (window.__legacyCtaAnalytics || []).filter((event) => event.name === "methodology_destination_opened"),
    })`);
    assert.equal(analytics.href, destination[1], `${variant}: destination href changed during navigation`);
    assert.equal(analytics.events.length, 1, `${variant}: methodology_destination_opened must fire exactly once`);
    assert.deepEqual(analytics.events[0].data, {
      situation: expected.id,
      destination: destination[1],
      location: "desktop_selected_route",
    }, `${variant}: methodology destination analytics payload`);
  }

  async function assertMethodology(viewport, reducedMotion) {
    await setViewport(viewport, reducedMotion);
    await navigate("/methodologies", `document.querySelectorAll("[data-route-index]").length === 7`);
    for (let index = 0; index < routes.length; index += 1) {
      await inspectRoute(index, routes[index], viewport, reducedMotion);
      if (!reducedMotion && !viewport.mobile) {
        await assertPointerPulse("primary", `${viewport.name}/${routes[index].id}`);
        await assertPointerPulse("secondary", `${viewport.name}/${routes[index].id}`);
      }
    }
    if (!reducedMotion && !viewport.mobile) {
      // Click real anchors after their pulse checks: navigation and Umami must
      // both survive the handler, with no duplicate destination event.
      await assertDestinationClick(routes[0], "primary");
      await assertDestinationClick(routes[0], "secondary");
    }
  }

  async function inspectLegacyButtons(selector) {
    return evaluate(`(() => {
      const rect = (node) => {
        const value = node?.getBoundingClientRect();
        return value ? { left: value.left, right: value.right, top: value.top, bottom: value.bottom } : null;
      };
      const contained = (inner, outer) => Boolean(
        inner && outer
        && inner.left >= outer.left - 1 && inner.right <= outer.right + 1
        && inner.top >= outer.top - 1 && inner.bottom <= outer.bottom + 1,
      );
      return {
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        buttons: [...document.querySelectorAll(${JSON.stringify(selector)})].map((button) => {
          const label = button.querySelector(".pulse-action-label") || button;
          const range = document.createRange();
          range.selectNodeContents(label);
          return {
            tag: button.tagName,
            text: button.textContent.replace(/\\s+/g, " ").trim(),
            href: button.getAttribute("href"),
            visible: button.getBoundingClientRect().width > 0 && button.getBoundingClientRect().height > 0,
            bounded: contained(rect({ getBoundingClientRect: () => range.getBoundingClientRect() }), rect(button))
              && [...button.querySelectorAll("svg")].every((icon) => contained(rect(icon), rect(button))),
            overflow: button.scrollWidth - button.clientWidth,
          };
        }),
      };
    })()`);
  }

  async function assertIndustries(viewport) {
    await setViewport(viewport, true);
    await navigate("/industries", `Boolean(document.querySelector(".io"))`);
    const state = await inspectLegacyButtons(".io-start .pulse-action");
    assert.equal(state.buttons.length, 1, `${viewport.name}: industries CTA count`);
    assert.deepEqual(
      state.buttons.map(({ text, href }) => ({ text, href })),
      [{ text: "Book a value scan", href: "/value-scan" }],
      `${viewport.name}: industries migrated CTA`,
    );
    assert.ok(state.buttons.every((button) => button.tag === "A" && button.visible && button.bounded && button.overflow <= 1),
      `${viewport.name}: industries CTA clipping`);
    assert.ok(state.overflow <= 1, `${viewport.name}: industries horizontal overflow`);
  }

  async function assertValueScan(viewport) {
    await setViewport(viewport, true);
    await navigate("/value-scan", `Boolean(document.querySelector(".vs-hero")) && Boolean(document.querySelector("#start"))`);
    const state = await inspectLegacyButtons(".vs .pulse-action");
    assert.deepEqual(
      state.buttons.map(({ text, href }) => ({ text, href })),
      [
        { text: "Explore the session", href: null },
        { text: "Submit request", href: null },
        { text: "Return to intake form", href: null },
      ],
      `${viewport.name}: value scan migrated buttons`,
    );
    assert.ok(state.buttons.every((button) => button.tag === "BUTTON" && button.visible && button.bounded && button.overflow <= 1),
      `${viewport.name}: value scan CTA clipping`);
    assert.ok(state.overflow <= 1, `${viewport.name}: value scan horizontal overflow`);

    await evaluate("window.scrollTo({ top: 0, left: 0, behavior: 'auto' }); true");
    await evaluate("document.querySelector('.vs-hero .pulse-action').click(); true");
    await waitFor(
      `(() => {
        const target = document.querySelector("#start");
        const rect = target?.getBoundingClientRect();
        return Boolean(rect && rect.top < 170 && rect.bottom > 0 && window.scrollY > 200);
      })()`,
      `${viewport.name}: Value Scan hero anchor did not reach intake`,
    );

    await evaluate("document.querySelector('#close .pulse-action').scrollIntoView({ block: 'center', behavior: 'auto' }); true");
    await delay(50);
    await evaluate("document.querySelector('#close .pulse-action').click(); true");
    await waitFor(
      `(() => {
        const target = document.querySelector("#start");
        const rect = target?.getBoundingClientRect();
        return Boolean(rect && rect.top < 170 && rect.bottom > 0 && window.scrollY > 200);
      })()`,
      `${viewport.name}: Value Scan closing anchor did not return to intake`,
    );
  }

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Page.addScriptToEvaluateOnNewDocument", {
    source: `
      window.__legacyCtaAnalytics = [];
      window.umami = {
        track(name, data) {
          window.__legacyCtaAnalytics.push({ name, data: data || {} });
        },
      };
      window.__legacyCtaPulseFrames = (selector, duration) => new Promise((resolve) => {
        const frames = [];
        const read = () => {
          const link = document.querySelector(selector);
          const icon = link.querySelector(".pulse-action-icon");
          const dot = link.querySelector(".pulse-action-dot");
          const trail = link.querySelector(".pulse-action-trail");
          const number = (value) => Number.parseFloat(value) || 0;
          const linkRect = link.getBoundingClientRect();
          return {
            left: number(getComputedStyle(icon).left),
            width: linkRect.width,
            dotRotate: number(getComputedStyle(dot).rotate),
            trailRotate: number(getComputedStyle(trail).rotate),
            trailOpacity: number(getComputedStyle(trail).opacity),
            motion: link.dataset.pulseActionMotion,
          };
        };
        const start = performance.now();
        const tick = () => {
          frames.push(read());
          if (performance.now() - start >= duration) resolve(frames);
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    `,
  });

  for (const viewport of viewports) {
    for (const reducedMotion of [false, true]) {
      await assertMethodology(viewport, reducedMotion);
    }
    await assertIndustries(viewport);
    await assertValueScan(viewport);
  }

  console.log("Legacy CTA browser regression passed: seven route situations, migrated CTAs and hero anchors.");
} finally {
  socket?.close();
  if (browser.exitCode === null) browser.kill("SIGTERM");
  await Promise.race([browserExited, delay(2000)]);
  if (browser.exitCode === null) browser.kill("SIGKILL");
  await rm(profilePath, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(() => {});
}