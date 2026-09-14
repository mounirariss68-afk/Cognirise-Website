import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { promisify } from "node:util";

const exec = promisify(execFile);
const normalize = (text) => text.replace(/\s+/g, " ").trim();
const prefix = "/methodologies/";
export const routeExpectations = [
  { id: "investment", situation: "We need to know where AI is worth investing.", destinations: [`${prefix}idao`, `${prefix}ai-use-case-prioritization`] },
  { id: "competing-ideas", situation: "We have several AI ideas and need to choose.", destinations: [`${prefix}ai-use-case-prioritization`, `${prefix}idao`] },
  { id: "existing-strategy", situation: "We have an AI strategy and need to implement it.", destinations: [`${prefix}idao`, `${prefix}ai-use-case-prioritization`] },
  { id: "process-problem", situation: "We need to improve a specific process.", destinations: [`${prefix}idao`, `${prefix}human-agent-operating-model`, `${prefix}agentic-operations-readiness`] },
  { id: "pilot-release", situation: "We have a pilot and need to put it into everyday use.", destinations: [`${prefix}idao`, `${prefix}agentic-operations-readiness`, `${prefix}human-agent-operating-model`] },
  { id: "proven-expansion", situation: "AI works in one area. We need to expand it.", destinations: [`${prefix}idao`, `${prefix}ai-value-to-scale`, `${prefix}ai-use-case-prioritization`] },
  { id: "underperformance", situation: "Our AI is in use, but the results are falling short.", destinations: [`${prefix}idao`, `${prefix}human-agent-operating-model`, `${prefix}ai-value-to-scale`] },
];

// Uses the existing Chromium/CDP harness and Poppler's pdftotext/pdfinfo tools.
// DOM print emulation alone cannot detect a card fragmented across PDF pages.
export async function assertMethodologyPrint({ send, evaluate, screenRoutes, width, outputDir }) {
  const tag = `Print from ${width}px`;
  assert.equal(await evaluate(`document.querySelector('.methodology-route-print').checkVisibility()`), false, "Static map must stay hidden on screen");
  await send("Emulation.setEmulatedMedia", { media: "print" });
  try {
    await evaluate(`document.fonts.ready.then(() => true)`);
    const print = await evaluate(`(() => {
      const root = document.querySelector('.methodology-route-print');
      const cards = [...root.querySelectorAll('article')];
      const anchors = root.querySelector('.methodology-print-anchors');
      const inspect = (element) => {
        const bounds = element.getBoundingClientRect();
        const nodes = [element, ...element.querySelectorAll('*')];
        return {
          breakInside: getComputedStyle(element).breakInside,
          visible: nodes.every(node => node.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })),
          unclipped: nodes.every(node => {
            const rect = node.getBoundingClientRect();
            return rect.left >= bounds.left - 1 && rect.right <= bounds.right + 1
              && rect.top >= bounds.top - 1 && rect.bottom <= bounds.bottom + 1
              && node.scrollWidth <= node.clientWidth + 1
              && node.scrollHeight <= node.clientHeight + 1;
          }),
          // Check ancestors too: a fixed-height or overflow-hidden wrapper can clip whole cards.
          ancestorsUnclipped: (() => {
            for (let parent = element.parentElement; parent; parent = parent.parentElement) {
              const style = getComputedStyle(parent);
              const rect = parent.getBoundingClientRect();
              if (['hidden', 'clip', 'scroll', 'auto'].includes(style.overflowY)
                && (bounds.top < rect.top - 1 || bounds.bottom > rect.bottom + 1)) return false;
              if (['hidden', 'clip', 'scroll', 'auto'].includes(style.overflowX)
                && (bounds.left < rect.left - 1 || bounds.right > rect.right + 1)) return false;
            }
            return true;
          })(),
          paragraphs: [...element.querySelectorAll('p, h3')].map(node => node.textContent.trim()),
          links: [...element.querySelectorAll('a')].map(link => ({
            text: link.textContent.trim(),
            href: link.getAttribute('href'),
            printedSuffix: getComputedStyle(link, '::after').content,
          })),
        };
      };
      return {
        media: matchMedia('print').matches,
        screenHidden: !document.querySelector('.methodology-route-screen').checkVisibility(),
        rootVisible: root.checkVisibility(),
        cards: cards.map(card => ({ id: card.dataset.printRoute, ...inspect(card) })),
        anchors: inspect(anchors),
      };
    })()`);
    assert.equal(print.media, true);
    assert.equal(print.screenHidden, true, `${tag}: interactive selector must not print`);
    assert.equal(print.rootVisible, true, `${tag}: static map must print`);
    assert.deepEqual(print.cards.map(card => card.id), routeExpectations.map(route => route.id), `${tag}: seven distinct routes`);
    assert.deepEqual(print.anchors.links.map(({ text, href }) => ({ text, href })), [
      { text: "IDAO Delivery Framework", href: `${prefix}idao` },
      { text: "Agent Authority Model", href: `${prefix}agent-authority-model` },
    ], `${tag}: two separate governing anchors`);

    for (const [index, card] of print.cards.entries()) {
      const expected = routeExpectations[index];
      const text = normalize(card.paragraphs.join(" "));
      for (const copy of [expected.situation, ...screenRoutes[index].copy]) {
        assert.ok(text.includes(normalize(copy)), `${tag}: ${card.id} missing ${copy}`);
      }
      assert.deepEqual(card.links.map(link => link.href), expected.destinations, `${tag}: ${card.id} destinations`);
    }
    for (const block of [...print.cards, print.anchors]) {
      const name = block.id || "governing anchors";
      assert.equal(block.visible, true, `${tag}: ${name} visible in full`);
      assert.equal(block.unclipped, true, `${tag}: ${name} content fits`);
      assert.equal(block.ancestorsUnclipped, true, `${tag}: ${name} not clipped by wrapper`);
      assert.match(block.breakInside, /^avoid(?:-page)?$/, `${tag}: ${name} avoids page breaks`);
      for (const link of block.links) {
        assert.ok(link.printedSuffix.includes(link.href), `${tag}: ${link.href} readable on paper`);
      }
    }

    const { data } = await send("Page.printToPDF", {
      preferCSSPageSize: true, printBackground: false, displayHeaderFooter: false,
    });
    const pdfPath = `${outputDir}/methodology-${width}.pdf`;
    await writeFile(pdfPath, Buffer.from(data, "base64"));
    const [{ stdout: text }, { stdout: urls }, { stdout: bbox }] = await Promise.all([
      exec("pdftotext", ["-layout", pdfPath, "-"]),
      exec("pdfinfo", ["-url", pdfPath]),
      exec("pdftotext", ["-bbox", pdfPath, "-"]),
    ]);
    const pages = text.split("\f").map(normalize).filter(Boolean);
    assert.ok(pages.length >= 2, `${tag}: verify actual multipage output`);
    for (const block of [...print.cards, print.anchors]) {
      // Every paragraph and destination of a card must survive on ONE page.
      const expected = [...block.paragraphs, ...block.links.map(link => link.href)].map(normalize);
      const closestPage = [...pages].sort((a, b) => expected.filter(copy => b.includes(copy)).length - expected.filter(copy => a.includes(copy)).length)[0] ?? "";
      assert.ok(pages.some(page => expected.every(copy => page.includes(copy))),
        `${tag}: ${block.id || "governing anchors"} split or missing in PDF; missing from closest page: ${JSON.stringify(expected.filter(copy => !closestPage.includes(copy)))}; page: ${closestPage}`);
      for (const link of block.links) {
        assert.ok(urls.split("\n").some(line => line.trim().endsWith(link.href)),
          `${tag}: PDF lost clickable destination ${link.href}`);
      }
    }
    // Text must stay within the A4 14mm printable area, not merely exist in the PDF.
    const margin = 14 / 25.4 * 72;
    for (const page of bbox.matchAll(/<page width="([\d.]+)" height="([\d.]+)">([\s\S]*?)<\/page>/g)) {
      for (const word of page[3].matchAll(/<word xMin="([\d.-]+)" yMin="([\d.-]+)" xMax="([\d.-]+)" yMax="([\d.-]+)">/g)) {
        assert.ok(+word[1] >= margin - 1 && +word[2] >= margin - 1
          && +word[3] <= +page[1] - margin + 1 && +word[4] <= +page[2] - margin + 1,
        `${tag}: PDF text outside printable page bounds`);
      }
    }
    console.log(`${tag}: seven complete route cards, two anchors and PDF destinations verified (${pages.length} pages)`);
  } finally {
    await send("Emulation.setEmulatedMedia", { media: "screen" });
  }
  assert.equal(await evaluate(`document.querySelector('.methodology-route-screen').checkVisibility()`), true, `${tag}: screen restored`);
  assert.equal(await evaluate(`document.querySelector('.methodology-route-print').checkVisibility()`), false, `${tag}: static map hidden again`);
}