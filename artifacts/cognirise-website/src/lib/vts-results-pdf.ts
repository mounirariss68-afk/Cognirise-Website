import {
  calculateMaturity,
  MATURITY_DIMENSIONS,
  MATURITY_STAGES,
  type MaturityAnswers,
} from "./value-to-scale";

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 48;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

type TextOptions = {
  bold?: boolean;
  color?: string;
  size?: number;
  before?: number;
  after?: number;
};

function isCompleteAnswers(answers: MaturityAnswers): boolean {
  return MATURITY_DIMENSIONS.every((dimension) => {
    const score = answers[dimension.id];
    return Number.isInteger(score) && (score ?? 0) >= 1 && (score ?? 0) <= 5;
  });
}

function winAnsiCode(character: string): number {
  const code = character.codePointAt(0) ?? 63;
  if (code <= 255) return code;
  const replacements: Record<number, number> = {
    0x2013: 150,
    0x2014: 151,
    0x2018: 145,
    0x2019: 146,
    0x201c: 147,
    0x201d: 148,
    0x2022: 149,
    0x2026: 133,
  };
  return replacements[code] ?? 63;
}

function pdfString(text: string): string {
  let encoded = "";
  for (const character of text) {
    const code = winAnsiCode(character);
    if (code === 40 || code === 41 || code === 92) encoded += `\\${String.fromCharCode(code)}`;
    else if (code < 32 || code > 126) encoded += `\\${code.toString(8).padStart(3, "0")}`;
    else encoded += String.fromCharCode(code);
  }
  return encoded;
}

function wrapText(text: string, size: number, width = CONTENT_WIDTH): string[] {
  const maxCharacters = Math.max(12, Math.floor(width / (size * 0.52)));
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length <= maxCharacters) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function assemblePdf(pageStreams: string[]): Uint8Array {
  const objects: string[] = [];
  const pageObjectIds = pageStreams.map((_, index) => 5 + index * 2);
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageStreams.length} >>`;
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";

  pageStreams.forEach((stream, index) => {
    const pageId = pageObjectIds[index];
    const contentId = pageId + 1;
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`;
    objects[contentId] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  });

  // Keep the file body ASCII-only (non-ASCII text is WinAnsi octal-escaped)
  // so JavaScript string offsets are also exact PDF byte offsets.
  let document = "%PDF-1.4\n%COGNIRISE\n";
  const offsets: number[] = [0];
  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = document.length;
    document += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xrefOffset = document.length;
  document += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id += 1) {
    document += `${offsets[id].toString().padStart(10, "0")} 00000 n \n`;
  }
  document += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return new TextEncoder().encode(document);
}

/**
 * Creates a self-contained, personalized VTS result PDF from complete answers.
 * Throws rather than producing a misleading partial report.
 */
export function createVtsResultsPdf(answers: MaturityAnswers): Uint8Array {
  if (!isCompleteAnswers(answers)) {
    throw new Error("Complete all seven assessment dimensions before downloading your results.");
  }

  const result = calculateMaturity(answers);
  const pages: string[][] = [];
  let commands: string[] = [];
  let y = PAGE_HEIGHT - 112;

  const startPage = () => {
    commands = [
      "0.965 0.961 0.941 rg 0 0 595 842 re f",
      "0.063 0.161 0.341 rg 0 754 595 88 re f",
      "0.929 0.224 0.518 rg 48 748 94 6 re f",
      `BT /F2 18 Tf 1 1 1 rg 1 0 0 1 ${MARGIN} 790 Tm (${pdfString("COGNIRISE · AI VALUE TO SCALE")}) Tj ET`,
    ];
    pages.push(commands);
    y = PAGE_HEIGHT - 112;
  };

  const addText = (text: string, options: TextOptions = {}) => {
    const size = options.size ?? 10;
    const lineHeight = size * 1.42;
    const lines = wrapText(text, size);
    const requiredHeight = (options.before ?? 0) + lines.length * lineHeight + (options.after ?? 0);
    if (y - requiredHeight < 52) startPage();
    y -= options.before ?? 0;
    const font = options.bold ? "F2" : "F1";
    const color = options.color ?? "0.114 0.196 0.333";
    for (const line of lines) {
      commands.push(`BT /${font} ${size} Tf ${color} rg 1 0 0 1 ${MARGIN} ${y.toFixed(2)} Tm (${pdfString(line)}) Tj ET`);
      y -= lineHeight;
    }
    y -= options.after ?? 0;
  };

  startPage();
  addText("Your directional result", { bold: true, color: "0.463 0.349 0.875", size: 11, after: 5 });
  addText(`${result.stage.name} · ${result.average.toFixed(1)} / 5`, { bold: true, color: "0.063 0.161 0.341", size: 25, after: 7 });
  addText(result.stage.test, { size: 11, after: 4 });
  addText("The label is a summary, not the decision: the dimension pattern and missing evidence determine the next work.", { size: 10, after: 14 });

  addText("Your seven answers", { bold: true, color: "0.063 0.161 0.341", size: 16, after: 8 });
  result.dimensions.forEach((dimension, index) => {
    const selectedStage = MATURITY_STAGES[dimension.score - 1];
    addText(`${index + 1}. ${dimension.name} — ${dimension.score} / 5 · ${selectedStage.name}`, { bold: true, size: 11, before: 5, after: 2 });
    addText(selectedStage.test, { size: 9, after: 2 });
    addText(`Evidence prompt: ${dimension.evidence}`, { color: "0.329 0.408 0.537", size: 9, after: 4 });
  });

  addText("Priorities, evidence and next actions", { bold: true, color: "0.063 0.161 0.341", size: 16, before: 10, after: 8 });
  result.priorities.forEach((item, index) => {
    addText(`${String(index + 1).padStart(2, "0")} · ${item.name} (${item.score} / 5)`, { bold: true, size: 11, before: 5, after: 2 });
    addText(`Evidence check: ${item.score >= 4 ? "revalidate" : "confirm"} ${item.evidence.toLowerCase()}`, { size: 9, after: 2 });
    addText(`Next action: ${item.action}`, { size: 9, after: 5 });
  });

  addText("Important caveats", { bold: true, color: "0.063 0.161 0.341", size: 16, before: 10, after: 7 });
  addText("This is a directional planning tool, not an audit, certification or benchmark.", { size: 9, after: 3 });
  addText("A facilitated Value Scan is a separate exercise. Contact is optional, and these assessment answers are not sent to Cognirise or included in the separate Value Scan form.", { size: 9 });

  return assemblePdf(pages.map((page) => page.join("\n")));
}

export function downloadVtsResultsPdf(
  answers: MaturityAnswers,
  filename = "cognirise-value-to-scale-results.pdf",
): void {
  if (typeof document === "undefined" || typeof URL === "undefined") {
    throw new Error("PDF download is only available in a browser.");
  }
  const bytes = createVtsResultsPdf(answers);
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}