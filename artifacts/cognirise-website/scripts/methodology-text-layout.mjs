import assert from "node:assert/strict";

// Chromium has no Firefox-style text-only zoom API. Snapshot computed typography
// before changing it: root font-size alone misses the components' px/clamp text,
// while CSS zoom/device scale also enlarges boxes and cannot test text reflow.
// Scope to the components under test, leaving surrounding page chrome unchanged.
export async function resizeText(evaluate, selector, scale) {
  const result = await evaluate(`(async () => {
    await document.fonts.ready;
    const previous = document.getElementById("methodology-text-resize");
    if (previous?.sheet) previous.sheet.disabled = true;
    previous?.remove();
    for (const element of document.querySelectorAll("[data-text-resize-index]")) element.removeAttribute("data-text-resize-index");
    await new Promise(resolve => requestAnimationFrame(resolve));
    const root = document.querySelector(${JSON.stringify(selector)});
    const elements = [root, ...root.querySelectorAll("*")].filter(el => el instanceof HTMLElement);
    const measurements = elements.map(element => {
      const style = getComputedStyle(element);
      return { element, font: parseFloat(style.fontSize), line: parseFloat(style.lineHeight) };
    });
    window.__methodologyTextBaselines ??= new WeakMap();
    const baselinesMatch = measurements.every(({ element, font }) => {
      const original = window.__methodologyTextBaselines.get(element);
      window.__methodologyTextBaselines.set(element, font);
      return original === undefined || Math.abs(original - font) < 0.1;
    });
    const stylesheet = document.createElement("style");
    stylesheet.id = "methodology-text-resize";
    stylesheet.textContent = measurements.map(({ element, font, line }, index) => {
      element.dataset.textResizeIndex = index;
      return '[data-text-resize-index="' + index + '"] { font-size: ' + font * ${scale} +
        'px !important; ' + (Number.isFinite(line) ? 'line-height: ' + line * ${scale} + 'px !important;' : '') + ' }';
    }).join("\\n");
    document.head.append(stylesheet);
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return {
      count: measurements.length,
      doubled: measurements.every(({ element, font }) =>
        Math.abs(parseFloat(getComputedStyle(element).fontSize) - font * ${scale}) < 0.1),
      baselinesMatch,
    };
  })()`);
  assert.ok(result.count > 10, "Text resizing must exercise actual component content");
  assert.ok(result.baselinesMatch, "Repeated resize must not compound text size on retained elements");
  assert.ok(result.doubled, `All component typography must render at ${scale * 100}%`);
}

export async function assertNoClipping(evaluate, selector, context) {
  const issues = await evaluate(`(() => {
    const root = document.querySelector(${JSON.stringify(selector)});
    const issues = [];
    const describe = el => el.getAttribute("data-testid") || el.tagName + ":" + el.textContent.trim().slice(0, 55);
    const visible = el => el.checkVisibility() && el.getBoundingClientRect().width > 0;
    const inside = (a, b) => a.left >= b.left - 2 && a.right <= b.right + 2 && a.top >= b.top - 2 && a.bottom <= b.bottom + 2;
    const rootRect = root.getBoundingClientRect();
    if (document.documentElement.scrollWidth > innerWidth + 1) issues.push("horizontal page scrolling");
    for (const el of [root, ...root.querySelectorAll("*")]) {
      if (!(el instanceof HTMLElement) || !visible(el)) continue;
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      if (!inside(rect, rootRect)) issues.push("outside component: " + describe(el));
      if (style.display !== "inline" && el.clientWidth && el.scrollWidth > el.clientWidth + 2)
        issues.push("horizontal content overflow: " + describe(el));
      // Tight display line-height can legitimately paint glyphs outside the line
      // box; that is only clipping when overflow actually hides those glyphs.
      if (/(hidden|clip|auto|scroll)/.test(style.overflowY) && style.display !== "inline" && el.clientHeight && el.scrollHeight > el.clientHeight + 2)
        issues.push("vertical content overflow: " + describe(el));
      // Bounding boxes alone miss glyphs clipped by an overflow-hidden ancestor.
      for (const node of el.childNodes) {
        if (node.nodeType !== Node.TEXT_NODE || !node.textContent.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const textRect of range.getClientRects()) {
          if (!inside(textRect, rootRect)) issues.push("text outside component: " + describe(el));
          for (let ancestor = el; ancestor && root.contains(ancestor); ancestor = ancestor.parentElement) {
            const ancestorStyle = getComputedStyle(ancestor);
            const bounds = ancestor.getBoundingClientRect();
            if (/(hidden|clip|auto|scroll)/.test(ancestorStyle.overflowX) &&
                (textRect.left < bounds.left - 2 || textRect.right > bounds.right + 2))
              issues.push("text clipped horizontally: " + describe(el));
            if (/(hidden|clip|auto|scroll)/.test(ancestorStyle.overflowY) &&
                (textRect.top < bounds.top - 2 || textRect.bottom > bounds.bottom + 2))
              issues.push("text clipped vertically: " + describe(el));
          }
        }
      }
    }
    return [...new Set(issues)];
  })()`);
  assert.deepEqual(issues, [], context);
}

export async function assertFocusedVisible(evaluate, selector, context) {
  const state = await evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(innerWidth - 1, rect.left + rect.width / 2));
    const y = Math.max(0, Math.min(innerHeight - 1, rect.top + rect.height / 2));
    const top = document.elementFromPoint(x, y);
    return {
      focused: document.activeElement === el,
      visible: el.checkVisibility() && rect.width > 0 && rect.height > 0 &&
        rect.left >= -1 && rect.right <= innerWidth + 1 &&
        rect.top >= -1 && rect.bottom <= innerHeight + 1,
      unobscured: top === el || el.contains(top),
    };
  })()`);
  if (!state.focused || !state.visible || !state.unobscured) {
    const diagnostic = await evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      const rect = el.getBoundingClientRect();
      return { rect: rect.toJSON(), covering: document.elementFromPoint(rect.left + rect.width / 2, Math.max(0, Math.min(innerHeight - 1, rect.top + rect.height / 2)))?.outerHTML.slice(0, 400) };
    })()`);
    assert.fail(context + "\n" + JSON.stringify({ state, diagnostic }));
  }
}