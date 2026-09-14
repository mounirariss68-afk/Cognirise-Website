import { readFileSync } from "node:fs";
import type { CmsFrameworkContent } from "@workspace/api-zod";

// Staging-only importer. Attachment instructions never enter the CMS payload.
const read = (name: string) => readFileSync(new URL(`../../../attached_assets/${name}`, import.meta.url), "utf8");
const copy = read("guardrails-page-copy_1789364808531.md");
const sections = copy.split(/^## \d+ · .+$/m).slice(1);
const clean = (value: string) => value.trim();
const field = (section: string, label: string) => {
  const marker = `**${label}:**`;
  const tail = section.slice(section.indexOf(marker) + marker.length).trimStart();
  return tail.split("\n")[0].trim();
};
const paragraphAfter = (section: string, marker: string) => {
  const position = section.indexOf(marker);
  if (position < 0) throw new Error(`Missing reviewed marker ${marker}`);
  return section.slice(position + marker.length).trimStart().split("\n\n")[0].trim();
};
const table = (section: string) => section.split("\n").filter((line) => line.startsWith("|") && !/^\|[-| ]+\|$/.test(line)).map((line) => line.split("|").slice(1, -1).map(clean));
const bodyBetween = (section: string, start: string, end = "\n---") => section.slice(section.indexOf(start) + start.length, section.indexOf(end) < 0 ? undefined : section.indexOf(end)).trim().split("\n\n").map(clean);
const heading = (section: string) => field(section, "Section heading");
const svgTexts = (name: string) => {
  const svg = read(name);
  const texts = [...svg.matchAll(/<text\b[^>]*>(.*?)<\/text>/gs)].map((match) => match[1]);
  return { title: svg.match(/<title[^>]*>(.*?)<\/title>/s)![1], description: svg.match(/<desc[^>]*>(.*?)<\/desc>/s)![1], texts };
};
const a = svgTexts("illustration-A-four-layers_1789364808532.svg");
const b = svgTexts("illustration-B-sufficiency_1789364808532.svg");
const layerIds = ["policy", "prompt", "runtime", "architecture"] as const;
const tableA = table(sections[2]);
const tableB = table(sections[3]);
const tableMaintenance = table(sections[6]);
const questionPanelIds = ["enforcement", "presence", "afterwards"] as const;
const methodPhaseIds = ["set", "prove", "hold"] as const;
const referenceGroupIds = ["forbid", "bypass", "measured"] as const;
const diagramRows = [
  { label: a.texts[2], description: a.texts[3], example: a.texts[4], bypassLabel: a.texts[5], bypass: a.texts.slice(6, 8).join(" ") },
  { label: a.texts[8], description: a.texts[9], example: a.texts[10], bypassLabel: a.texts[11], bypass: a.texts.slice(12, 14).join(" ") },
  { label: a.texts[15], description: a.texts.slice(16, 18).join(" "), example: a.texts.slice(18, 20).join(" "), bypassLabel: a.texts[20], bypass: a.texts.slice(21, 25).join(" ") },
  { label: a.texts[25], description: a.texts.slice(26, 28).join(" "), example: a.texts.slice(28, 30).join(" "), bypassLabel: a.texts[30], bypass: a.texts.slice(31, 34).join(" ") },
].map((row, index) => ({ id: layerIds[index], ...row, strength: index + 1, strengthLabel: `${index + 1} of 4` }));
const bandIds = ["internal-reversible", "reversible-cost", "irreversible-customer", "regulator-public-safety", "above-ceiling"] as const;
const destinations = ["prompt", "runtime", "runtime", "architecture", "architecture"] as const;
const additions = ["monitoring", "none", "architectural-scoping", "independent-control", "authority-artefact"] as const;
const tableExposures = tableB.slice(1).map((cells, index) => ({
  id: bandIds[index], handover: cells[0], requirement: cells[1],
  enforcementLayer: destinations[index], additionId: additions[index],
}));
const linkCard = field(sections[8], "Link card").split(" → ");
const phases = ["SET", "PROVE", "HOLD"].map((name, index) => {
  const part = sections[5].split(`**${name} · `)[1];
  return { id: methodPhaseIds[index], name, caption: part.split("**")[0], steps: part.split("\n").filter((line) => /^\d\. /.test(line)).slice(0, 4).map((line) => line.replace(/^\d\. /, "")) };
});

export const guardrailsFixture = {
  slug: "guardrails-framework",
  title: "The Guardrails Framework",
  summary: paragraphAfter(sections[0], "**Sub-headline:**"),
  content: {
    schemaVersion: 1,
    template: "guardrails",
    contentVersion: "guardrails-legacy-v1",
    hero: {
      eyebrow: field(sections[0], "Eyebrow"),
      headline: paragraphAfter(sections[0], "**Headline:**"),
      subheadline: paragraphAfter(sections[0], "**Sub-headline:**"),
      primaryAction: { label: field(sections[0], "Primary action"), href: "/contact" },
      secondaryAction: { label: field(sections[0], "Secondary action"), href: "/methodologies/agent-authority-model" },
    },
    distinction: { heading: heading(sections[1]), body: bodyBetween(sections[1], `**Section heading:** ${heading(sections[1])}`) },
    layers: {
      heading: heading(sections[2]), intro: field(sections[2], "Intro"),
      exampleText: paragraphAfter(sections[2], "**The worked example, in the illustration and repeated in the table:**"),
      tableHeaders: tableA[0],
      table: tableA.slice(1).map((cells, index) => ({ id: layerIds[index], layer: cells[0], whatItIs: cells[1], inThisExample: cells[2], whatGetsPastIt: cells[3], strength: index + 1, strengthLabel: cells[4] })),
      pullOut: paragraphAfter(sections[2], "**Pull-out below the table:**").replace(/^> /, ""),
      closingLine: paragraphAfter(sections[2], "**Closing line of the section:**"),
      aside: { heading: "The fifth thing, which is not a layer", body: paragraphAfter(sections[2], "**Aside card — the fifth thing, which is not a layer:**") },
      diagram: { title: a.title, description: a.description, kicker: a.texts[0], rule: a.texts[1], rows: diagramRows, thresholdAfter: "prompt", thresholdLabel: a.texts[14], footer: a.texts[34] },
    },
    stoppingRule: {
      heading: heading(sections[3]), intro: field(sections[3], "Intro"), tableHeaders: tableB[0], exposures: tableExposures,
      pullOut: paragraphAfter(sections[3], "**Pull-out:**").replace(/^> /, ""),
      diagram: {
        title: b.title, description: b.description, kicker: b.texts[0], heading: b.texts[1], bandHeading: b.texts[2], destinationHeading: b.texts[3],
        bands: bandIds.map((id, index) => ({ id, label: b.texts[4 + index * 2], description: b.texts[5 + index * 2], destination: destinations[index], additionId: additions[index] })),
        destinations: [
          { id: "prompt", label: b.texts[14], description: b.texts[15] },
          { id: "runtime", label: b.texts[16], description: b.texts[17] },
          { id: "architecture", label: b.texts[19], description: b.texts[20] },
        ],
        additions: [{ id: "monitoring", label: b.texts[15] }, { id: "architectural-scoping", label: b.texts[18] }, { id: "independent-control", label: b.texts[21] }, { id: "authority-artefact", label: b.texts[22] }],
        footer: b.texts[23], note: b.texts[24],
      },
    },
    questions: {
      heading: heading(sections[4]), intro: field(sections[4], "Intro"),
      panels: [...sections[4].matchAll(/\*\*Column \d — (.*?)\*\*\n(.*)/g)].map((match, index) => ({ id: questionPanelIds[index], title: match[1], body: match[2] })),
    },
    method: { heading: heading(sections[5]), intro: field(sections[5], "Intro"), phases },
    maintenance: {
      heading: heading(sections[6]), tableHeaders: tableMaintenance[0],
      table: tableMaintenance.slice(1).map((cells, index) => ({ id: layerIds[index], layer: cells[0], set: cells[1], prove: cells[2], hold: cells[3] })),
      closingParagraph: paragraphAfter(sections[6], "**Closing paragraph:**"),
    },
    measurement: { heading: heading(sections[7]), statement: paragraphAfter(sections[7], "**Large display statement:**"), supportingLine: paragraphAfter(sections[7], "**Supporting line:**") },
    authority: {
      heading: heading(sections[8]), body: bodyBetween(sections[8], "**Body:**", "**Link card:**"),
      linkCard: { title: `${linkCard[0]} →`, description: linkCard[1], href: "/methodologies/agent-authority-model" },
    },
    references: {
      heading: "What this is built from",
      intro: bodyBetween(sections[9], "**Intro:**", "**What to forbid**"),
      groups: ["What to forbid", "How it gets bypassed, and how to test", "What you will be measured against"].map((title, index) => ({ id: referenceGroupIds[index], title, items: paragraphAfter(sections[9], `**${title}**`) })),
    },
    moves: {
      heading: heading(sections[10]),
      moves: [...sections[10].matchAll(/\*\*(Move \d[^*]*)\*\*\n(.*)/g)].map((match, index) => ({ number: index + 1, title: match[1], body: match[2] })),
      cta: { heading: field(sections[10], "Heading"), body: field(sections[10], "Body"), button: { label: field(sections[10], "Button"), href: "/contact" } },
      footerNote: field(sections[10], "Footer note (small)"),
    },
    relatedLink: { title: "The Guardrails Framework", body: "Authority decides what a handover is allowed to do. Guardrails decide how strongly that is enforced, and how you know it still holds. →", href: "/methodologies/guardrails-framework" },
    visibility: "hidden", order: 0, sources: [], relatedIds: [],
  } satisfies CmsFrameworkContent,
  seo: { title: field(copy, "Page title (browser/SEO)"), description: field(copy, "Meta description"), noIndex: false },
  mediaIds: [], markets: ["uae"],
};