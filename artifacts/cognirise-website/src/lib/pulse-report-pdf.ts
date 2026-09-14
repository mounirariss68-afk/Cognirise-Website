/**
 * Small Pulse report writer with browser-side OpenType shaping.
 *
 * Reports are built in the browser from the current React state.  Answers are
 * never posted anywhere and the only network request made by the async
 * variant is for same-origin, already-published artwork and font binaries.
 * The writer uses live PDF text (rather than a screenshot) so clients can
 * search and copy their report. Browser downloads embed Comfortaa, Inter and
 * an Arabic-capable Noto Sans fallback; the synchronous builder retains a
 * built-in fallback for tests and non-browser callers.
 */

export type PulseReportAnswer = {
  label: string;
  value: string;
  detail?: string;
};

export type PulseReportSection = {
  heading: string;
  paragraphs?: string[];
  answers?: PulseReportAnswer[];
};

export type PulseReport = {
  methodId: string;
  title: string;
  eyebrow: string;
  summary: string;
  resultLabel: string;
  resultDetail: string;
  sections: PulseReportSection[];
  nextSteps: string[];
  limitations: string[];
  imagePath?: string;
  filename?: string;
};

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 48;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const NAVY = "0.063 0.161 0.341";
const INK = "0.114 0.196 0.333";
const MUTED = "0.329 0.408 0.537";
const VIOLET = "0.463 0.349 0.875";
const PINK = "0.859 0.314 0.620";
const CORAL = "1 0.467 0.365";
const PAPER = "0.984 0.980 0.965";

type TextOptions = {
  font?: "body" | "display";
  color?: string;
  size?: number;
  before?: number;
  after?: number;
  width?: number;
};

type PdfObject = string | Uint8Array;

function encodeAscii(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function pdfString(value: string): string {
  let result = "";
  for (const character of value.normalize("NFKC")) {
    const code = character.codePointAt(0) ?? 63;
    const replacements: Record<number, number> = {
      0x2013: 150,
      0x2014: 151,
      0x2018: 145,
      0x2019: 146,
      0x201c: 147,
      0x201d: 148,
      0x2022: 149,
      0x2026: 133,
      0x00a0: 32,
      0x2192: 45,
    };
    const winAnsi = code <= 255 ? code : replacements[code] ?? 63;
    if (winAnsi === 40 || winAnsi === 41 || winAnsi === 92) {
      result += `\\${String.fromCharCode(winAnsi)}`;
    } else if (winAnsi < 32 || winAnsi > 126) {
      result += `\\${winAnsi.toString(8).padStart(3, "0")}`;
    } else {
      result += String.fromCharCode(winAnsi);
    }
  }
  return result;
}

function textLines(value: string, size: number, width = CONTENT_WIDTH): string[] {
  const maxCharacters = Math.max(10, Math.floor(width / (size * 0.5)));
  const lines: string[] = [];
  for (const paragraph of value.replace(/\r/g, "").split("\n")) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      // Long IDs, URLs and unbroken evidence notes still need to wrap.
      if (word.length > maxCharacters) {
        if (line) {
          lines.push(line);
          line = "";
        }
        for (let index = 0; index < word.length; index += maxCharacters) {
          lines.push(word.slice(index, index + maxCharacters));
        }
        continue;
      }
      const candidate = line ? `${line} ${word}` : word;
      if (candidate.length > maxCharacters && line) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

function jpegDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9) continue;
    if (offset + 2 > bytes.length) break;
    const length = (bytes[offset] << 8) | bytes[offset + 1];
    if (length < 2 || offset + length > bytes.length) break;
    const isFrame = marker >= 0xc0 && marker <= 0xc3
      || marker >= 0xc5 && marker <= 0xc7
      || marker >= 0xc9 && marker <= 0xcb
      || marker >= 0xcd && marker <= 0xcf;
    if (isFrame && offset + 7 < bytes.length) {
      return {
        height: (bytes[offset + 3] << 8) | bytes[offset + 4],
        width: (bytes[offset + 5] << 8) | bytes[offset + 6],
      };
    }
    offset += length;
  }
  return null;
}

function toHex(bytes: Uint8Array): string {
  let result = "";
  for (const byte of bytes) result += byte.toString(16).padStart(2, "0");
  return `${result}>`;
}

function makeImageObject(bytes: Uint8Array): PdfObject | null {
  const dimensions = jpegDimensions(bytes);
  if (!dimensions) return null;
  const hex = toHex(bytes);
  return `<< /Type /XObject /Subtype /Image /Width ${dimensions.width} /Height ${dimensions.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter [/ASCIIHexDecode /DCTDecode] /Length ${hex.length} >>\nstream\n${hex}\nendstream`;
}

type EmbeddedFont = {
  pdfName: string;
  bytes: Uint8Array;
  cmap: Map<number, number>;
  advances: number[];
  unitsPerEm: number;
  unicodeByGlyph: Map<number, number>;
  shape?: (value: string) => Array<{ glyphId: number; unicode: number; advance: number }>;
};

type EmbeddedFonts = {
  display: EmbeddedFont;
  body: EmbeddedFont;
  arabic: EmbeddedFont;
};

function readU16(view: DataView, offset: number): number {
  return view.getUint16(offset, false);
}

function readU32(view: DataView, offset: number): number {
  return view.getUint32(offset, false);
}

function parseCmap(bytes: Uint8Array): Map<number, number> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tableCount = readU16(view, 4);
  let cmapOffset = 0;
  for (let index = 0; index < tableCount; index += 1) {
    const offset = 12 + index * 16;
    if (new TextDecoder("ascii").decode(bytes.slice(offset, offset + 4)) === "cmap") {
      cmapOffset = readU32(view, offset + 8);
      break;
    }
  }
  if (!cmapOffset) throw new Error("The embedded report font has no character map.");
  const cmap = new Map<number, number>();
  const recordCount = readU16(view, cmapOffset + 2);
  let fallbackFormat4 = 0;
  let format12 = 0;
  for (let index = 0; index < recordCount; index += 1) {
    const record = cmapOffset + 4 + index * 8;
    const subtable = cmapOffset + readU32(view, record + 4);
    const format = readU16(view, subtable);
    if (format === 12) format12 = subtable;
    if (format === 4 && !fallbackFormat4) fallbackFormat4 = subtable;
  }
  if (format12) {
    const groups = readU32(view, format12 + 12);
    for (let index = 0; index < groups; index += 1) {
      const group = format12 + 16 + index * 12;
      const start = readU32(view, group);
      const end = readU32(view, group + 4);
      const glyphStart = readU32(view, group + 8);
      for (let code = start; code <= end && code <= 0x10ffff; code += 1) {
        cmap.set(code, glyphStart + code - start);
      }
    }
    return cmap;
  }
  if (!fallbackFormat4) throw new Error("The embedded report font has no supported character map.");
  const segmentCount = readU16(view, fallbackFormat4 + 6) / 2;
  const endCodes = fallbackFormat4 + 14;
  const startCodes = endCodes + segmentCount * 2 + 2;
  const deltas = startCodes + segmentCount * 2;
  const rangeOffsets = deltas + segmentCount * 2;
  for (let segment = 0; segment < segmentCount; segment += 1) {
    const start = readU16(view, startCodes + segment * 2);
    const end = readU16(view, endCodes + segment * 2);
    const delta = view.getInt16(deltas + segment * 2, false);
    const rangeOffset = readU16(view, rangeOffsets + segment * 2);
    for (let code = start; code <= end && code !== 0xffff; code += 1) {
      let glyph = (code + delta) & 0xffff;
      if (rangeOffset) {
        const location = rangeOffsets + segment * 2 + rangeOffset + (code - start) * 2;
        glyph = readU16(view, location);
        if (glyph) glyph = (glyph + delta) & 0xffff;
      }
      if (glyph) cmap.set(code, glyph);
    }
  }
  return cmap;
}

function findTable(bytes: Uint8Array, tagName: string): { offset: number; length: number } | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tableCount = readU16(view, 4);
  const decoder = new TextDecoder("ascii");
  for (let index = 0; index < tableCount; index += 1) {
    const offset = 12 + index * 16;
    if (decoder.decode(bytes.slice(offset, offset + 4)) === tagName) {
      return { offset: readU32(view, offset + 8), length: readU32(view, offset + 12) };
    }
  }
  return null;
}

function parseFontMetrics(bytes: Uint8Array): { advances: number[]; unitsPerEm: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const head = findTable(bytes, "head");
  const hhea = findTable(bytes, "hhea");
  const maxp = findTable(bytes, "maxp");
  const hmtx = findTable(bytes, "hmtx");
  if (!head || !hhea || !maxp || !hmtx) throw new Error("The embedded report font has incomplete metrics.");
  const unitsPerEm = readU16(view, head.offset + 18);
  const glyphCount = readU16(view, maxp.offset + 4);
  const metricCount = readU16(view, hhea.offset + 34);
  const advances: number[] = [];
  let lastAdvance = 0;
  for (let glyph = 0; glyph < glyphCount; glyph += 1) {
    if (glyph < metricCount) lastAdvance = readU16(view, hmtx.offset + glyph * 4);
    advances.push(lastAdvance);
  }
  return { advances, unitsPerEm };
}

async function inflateWoffTable(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("This browser cannot unpack the embedded report fonts.");
  }
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function woffToTtf(bytes: Uint8Array): Promise<Uint8Array> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (readU32(view, 0) !== 0x774f4646) throw new Error("The embedded report font is not a WOFF file.");
  const tableCount = readU16(view, 12);
  const sfntSize = readU32(view, 16);
  const tables: Array<{ tag: Uint8Array; checksum: number; data: Uint8Array }> = [];
  for (let index = 0; index < tableCount; index += 1) {
    const entry = 44 + index * 20;
    const tag = bytes.slice(entry, entry + 4);
    const offset = readU32(view, entry + 4);
    const compressedLength = readU32(view, entry + 8);
    const length = readU32(view, entry + 12);
    const compressed = bytes.slice(offset, offset + compressedLength);
    const data = compressedLength < length ? await inflateWoffTable(compressed) : compressed;
    tables.push({ tag, checksum: readU32(view, entry + 16), data });
  }
  const output = new Uint8Array(sfntSize);
  const outputView = new DataView(output.buffer);
  const flavor = readU32(view, 4);
  outputView.setUint32(0, flavor, false);
  outputView.setUint16(4, tableCount, false);
  const entrySelector = Math.floor(Math.log2(tableCount));
  outputView.setUint16(6, 2 ** entrySelector * 16, false);
  outputView.setUint16(8, entrySelector, false);
  outputView.setUint16(10, tableCount * 16 - 2 ** entrySelector * 16, false);
  let dataOffset = 12 + tableCount * 16;
  for (let index = 0; index < tables.length; index += 1) {
    const table = tables[index];
    const directory = 12 + index * 16;
    output.set(table.tag, directory);
    outputView.setUint32(directory + 4, table.checksum, false);
    outputView.setUint32(directory + 8, dataOffset, false);
    outputView.setUint32(directory + 12, table.data.length, false);
    output.set(table.data, dataOffset);
    dataOffset += (table.data.length + 3) & ~3;
  }
  return output;
}

async function loadEmbeddedFont(url: string, pdfName: string): Promise<EmbeddedFont> {
  const response = await fetch(url, { credentials: "same-origin" });
  if (!response.ok) throw new Error(`The ${pdfName} report font could not be loaded (${response.status}).`);
  const bytes = await woffToTtf(new Uint8Array(await response.arrayBuffer()));
  const cmap = parseCmap(bytes);
  const unicodeByGlyph = new Map<number, number>();
  for (const [unicode, glyph] of cmap) {
    if (!unicodeByGlyph.has(glyph)) unicodeByGlyph.set(glyph, unicode);
  }
  return { pdfName, bytes, cmap, unicodeByGlyph, ...parseFontMetrics(bytes) };
}

async function loadEmbeddedFonts(): Promise<EmbeddedFonts | undefined> {
  // Node callers retain the synchronous, selectable-text fallback. Real
  // browser downloads load and embed the published font binaries below.
  if (typeof window === "undefined") return undefined;
  const fontAssets = await import("./pulse-report-font-assets");
  const [display, body, arabic] = await Promise.all([
    loadEmbeddedFont(fontAssets.comfortaaFontUrl, "Comfortaa"),
    loadEmbeddedFont(fontAssets.interFontUrl, "Inter"),
    loadEmbeddedFont(fontAssets.arabicFontUrl, "NotoSansArabic"),
  ]);
  // Fontkit performs OpenType shaping (including Arabic joining, direction
  // and ligatures) before glyph IDs are written into the PDF. The import is
  // browser-only so the synchronous test builder remains dependency-free.
  // @ts-expect-error fontkit ships browser ESM without declaration files.
  const fontkit = await import("fontkit");
  const shape = (font: EmbeddedFont) => {
    const face = fontkit.create(font.bytes);
    font.shape = (value: string) => {
      const run = face.layout(value);
      return run.glyphs.map((glyph: { id: number; codePoints?: number[]; advanceWidth?: number }, index: number) => {
        const unicode = glyph.codePoints?.[0] ?? 0;
        if (unicode) font.unicodeByGlyph.set(glyph.id, unicode);
        return {
          glyphId: glyph.id,
          unicode,
          advance: run.positions[index]?.xAdvance ?? glyph.advanceWidth ?? font.advances[glyph.id] ?? 0,
        };
      });
    };
  };
  shape(display);
  shape(body);
  shape(arabic);
  return { display, body, arabic };
}

function fontGlyphRun(value: string, font: EmbeddedFont): Array<{ glyphId: number; unicode: number; advance: number }> {
  // The published Latin subsets intentionally do not include every symbol.
  // Preserve meaning with an explicit textual expansion rather than allowing
  // a missing glyph to become an invisible/question-mark character.
  const prepared = value.normalize("NFKC")
    .replaceAll("→", "->")
    .replaceAll("←", "<-")
    .replaceAll("…", "...");
  for (const character of prepared) {
    const code = character.codePointAt(0) ?? 0;
    if (!font.cmap.has(code)) throw new Error(`The report font cannot encode character U+${code.toString(16).toUpperCase()}.`);
  }
  if (font.shape) {
    const shaped = font.shape(prepared);
    if (shaped.some((glyph) => glyph.glyphId === 0 && glyph.unicode !== 0)) {
      throw new Error("The report contains a character that the embedded font cannot encode.");
    }
    return shaped;
  }
  const fallback = font.cmap.get(63) ?? 0;
  const result: Array<{ glyphId: number; unicode: number; advance: number }> = [];
  for (const character of prepared) {
    const code = character.codePointAt(0) ?? 63;
    const glyphId = font.cmap.get(code);
    if (glyphId === undefined) throw new Error("The report contains a character that the embedded font cannot encode.");
    result.push({ glyphId, unicode: code, advance: font.advances[glyphId] ?? font.advances[fallback] ?? 0 });
  }
  return result;
}

function pdfGlyphString(value: string, font: EmbeddedFont): { value: string; advance: number } {
  const glyphs = fontGlyphRun(value, font);
  return {
    value: `<${glyphs.map(({ glyphId }) => glyphId.toString(16).padStart(4, "0")).join("")}>`,
    advance: glyphs.reduce((sum, glyph) => sum + glyph.advance, 0),
  };
}

function toUnicodeCmap(font: EmbeddedFont): string {
  const mappings = new Map<number, number>();
  for (const [glyph, code] of font.unicodeByGlyph) {
    if (code <= 0xffff && glyph <= 0xffff && !mappings.has(glyph)) mappings.set(glyph, code);
  }
  const entries = [...mappings.entries()];
  const chunks: string[] = [];
  for (let index = 0; index < entries.length; index += 100) {
    const chunk = entries.slice(index, index + 100);
    chunks.push(`${chunk.length} beginbfchar\n${chunk.map(([glyph, code]) => `<${glyph.toString(16).padStart(4, "0")}> <${code.toString(16).padStart(4, "0")}>`).join("\n")}\nendbfchar`);
  }
  return `/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> def\n/CMapName /${font.pdfName}-ToUnicode def\n/CMapType 2 def\n1 begincodespacerange\n<0000> <ffff>\nendcodespacerange\n${chunks.join("\n")}\nendcmap\nCMapName currentdict /CMap defineresource pop\nend\nend`;
}

function makePdf(objects: PdfObject[]): Uint8Array {
  const header = encodeAscii("%PDF-1.4\n%COGNIRISE-PULSE\n");
  const objectParts: Uint8Array[] = [header];
  const offsets: number[] = [0];
  let position = header.length;
  for (let index = 0; index < objects.length; index += 1) {
    offsets[index + 1] = position;
    const prefix = encodeAscii(`${index + 1} 0 obj\n`);
    const body = typeof objects[index] === "string" ? encodeAscii(objects[index] as string) : objects[index] as Uint8Array;
    const suffix = encodeAscii("\nendobj\n");
    objectParts.push(prefix, body, suffix);
    position += prefix.length + body.length + suffix.length;
  }
  const xrefOffset = position;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1) {
    xref += `${offsets[index].toString().padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 2 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  objectParts.push(encodeAscii(xref));
  return concatBytes(...objectParts);
}

function buildPdf(report: PulseReport, imageBytes?: Uint8Array, embeddedFonts?: EmbeddedFonts): Uint8Array {
  const imageObject = imageBytes ? makeImageObject(imageBytes) : null;
  const pageStreams: string[] = [];
  const pageHasImage: boolean[] = [];
  let commands: string[] = [];
  let y = PAGE_HEIGHT - 84;
  const displayFont = embeddedFonts ? "FD" : "F2";
  const bodyFont = embeddedFonts ? "FB" : "F1";
  const arabicFont = embeddedFonts ? "FA" : bodyFont;
  const hasArabic = (value: string) => /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]/u.test(value);
  const encodeTextRuns = (value: string, role: "body" | "display" = "body") => {
    if (!embeddedFonts) return [{ font: role === "display" ? displayFont : bodyFont, value: `(${pdfString(value)})`, source: value, advance: value.length * 500, unitsPerEm: 1000 }];
    const runs: Array<{ font: string; value: string; source: string; advance: number; unitsPerEm: number }> = [];
    let source = "";
    let arabic = false;
    const flush = () => {
      if (!source) return;
      const selected = arabic ? embeddedFonts.arabic : role === "display" ? embeddedFonts.display : embeddedFonts.body;
      const glyphString = pdfGlyphString(source, selected);
      runs.push({
        font: arabic ? arabicFont : role === "display" ? displayFont : bodyFont,
        value: glyphString.value,
        source,
        advance: glyphString.advance,
        unitsPerEm: selected.unitsPerEm,
      });
      source = "";
    };
    for (const character of value) {
      const characterIsArabic = hasArabic(character);
      if (source && characterIsArabic !== arabic) flush();
      arabic = characterIsArabic;
      source += character;
    }
    flush();
    return runs;
  };
  const encodeText = (value: string, role: "body" | "display" = "body") => {
    const runs = encodeTextRuns(value, role);
    return runs[0] ?? { font: role === "display" ? displayFont : bodyFont, value: embeddedFonts ? "<0000>" : "()", source: "", advance: 0, unitsPerEm: 1000 };
  };

  const footer = () => {
    commands.push(`0.063 0.161 0.341 rg 48 33 499 0.8 re f`);
    const pageNumber = pageStreams.length + 1;
    const footerMethod = encodeText(`COGNIRISE PULSE · ${report.methodId.toUpperCase()}`);
    const footerPage = encodeText(`Page ${pageNumber}`);
    commands.push(`BT /${footerMethod.font} 7 Tf ${MUTED} rg 1 0 0 1 48 21 Tm ${footerMethod.value} Tj ET`);
    commands.push(`BT /${footerPage.font} 7 Tf ${MUTED} rg 1 0 0 1 490 21 Tm ${footerPage.value} Tj ET`);
  };
  const startPage = (cover = false) => {
    if (commands.length > 0) {
      footer();
      pageStreams.push(commands.join("\n"));
      pageHasImage.push(false);
    }
    commands = [`${PAPER} rg 0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT} re f`];
    y = cover ? PAGE_HEIGHT - 390 : PAGE_HEIGHT - 88;
  };
  const ensureSpace = (height: number) => {
    if (y - height < 58) startPage();
  };
  const addText = (value: string, options: TextOptions = {}) => {
    const size = options.size ?? 10;
    const lineHeight = size * 1.43;
    const role = options.font === "display" ? "display" : "body";
    const width = options.width ?? CONTENT_WIDTH;
    const measure = (text: string) => encodeTextRuns(text, role)
      .reduce((total, run) => total + (run.advance / run.unitsPerEm) * size, 0);
    const lines: string[] = [];
    for (const paragraph of value.split(/\r?\n/)) {
      let line = "";
      for (const word of paragraph.split(/\s+/).filter(Boolean)) {
        const candidate = line ? `${line} ${word}` : word;
        if (measure(candidate) <= width) {
          line = candidate;
          continue;
        }
        if (line) { lines.push(line); line = ""; }
        // A URL or identifier may have no whitespace. Split by code point,
        // using the same shaped metrics used to place the resulting PDF run.
        for (const character of word) {
          if (line && measure(line + character) > width) {
            lines.push(line);
            line = "";
          }
          line += character;
        }
      }
      lines.push(line);
    }
    ensureSpace((options.before ?? 0) + lineHeight);
    y -= options.before ?? 0;
    const color = options.color ?? INK;
    for (const line of lines) {
      ensureSpace(lineHeight);
      let x = MARGIN;
      for (const encoded of encodeTextRuns(line, options.font === "display" ? "display" : "body")) {
        commands.push(`BT /${encoded.font} ${size} Tf ${color} rg 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm ${encoded.value} Tj ET`);
        x += (encoded.advance / encoded.unitsPerEm) * size;
      }
      y -= lineHeight;
    }
    y -= options.after ?? 0;
  };
  const addRule = (color = PINK) => {
    ensureSpace(13);
    y -= 7;
    commands.push(`${color} rg ${MARGIN} ${(y - 2).toFixed(2)} 72 3 re f`);
    y -= 17;
  };

  // A deliberately composed cover: image, signal rail, live title text and
  // report metadata. No website navigation or controls are included.
  startPage(true);
  if (imageObject) {
    const dimensions = jpegDimensions(imageBytes!);
    const imageWidth = 499;
    const imageHeight = 250;
    const sourceRatio = dimensions ? dimensions.width / dimensions.height : 1.8;
    const targetRatio = imageWidth / imageHeight;
    let drawWidth = imageWidth;
    let drawHeight = imageHeight;
    let offsetX = MARGIN;
    let offsetY = 540;
    if (sourceRatio > targetRatio) {
      drawWidth = imageHeight * sourceRatio;
      offsetX -= (drawWidth - imageWidth) / 2;
    } else {
      drawHeight = imageWidth / sourceRatio;
      offsetY -= (drawHeight - imageHeight) / 2;
    }
    commands.push("q", `${MARGIN} 540 ${imageWidth} ${imageHeight} re W n`, `${drawWidth.toFixed(2)} 0 0 ${drawHeight.toFixed(2)} ${offsetX.toFixed(2)} ${offsetY.toFixed(2)} cm /Im1 Do`, "Q");
    pageHasImage[0] = true;
  } else {
    commands.push(`${NAVY} rg 48 540 499 250 re f`, `${VIOLET} rg 48 540 156 5 re f`, `${CORAL} rg 391 785 156 5 re f`);
  }
  commands.push(`${NAVY} rg 48 515 499 18 re f`);
  const eyebrow = encodeText(report.eyebrow.toUpperCase(), "display");
  commands.push(`BT /${eyebrow.font} 8 Tf 1 1 1 rg 1 0 0 1 60 521 Tm ${eyebrow.value} Tj ET`);
  addText(report.title, { font: "display", size: 31, color: NAVY, before: 42, after: 15, width: 450 });
  addText(report.summary, { size: 12, color: MUTED, after: 25, width: 460 });
  // End the cover before the result and evidence pages. The cover is a
  // considered introduction, never a cramped first worksheet page.
  addText(`Generated ${new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}`, { size: 8, color: MUTED });
  startPage();
  addRule();
  addText(`Result · ${report.resultLabel}`, { font: "display", size: 18, color: NAVY, after: 5 });
  addText(report.resultDetail, { size: 10, color: MUTED, after: 15, width: 470 });
  addText("Answers remain on this page and are represented in the following evidence record.", { size: 8, color: MUTED, after: 4 });

  for (const section of report.sections) {
    ensureSpace(48);
    addText(section.heading, { font: "display", size: 17, color: NAVY, before: 17, after: 8 });
    for (const paragraph of section.paragraphs ?? []) addText(paragraph, { size: 9.5, color: INK, after: 6 });
    for (const answer of section.answers ?? []) {
      ensureSpace(38);
      addText(answer.label, { font: "display", size: 10.5, color: NAVY, before: 2, after: 2 });
      addText(answer.value, { size: 9, color: INK, after: answer.detail ? 2 : 6, width: 450 });
      if (answer.detail) addText(answer.detail, { size: 8.5, color: MUTED, after: 7, width: 450 });
    }
  }
  ensureSpace(45);
  addText("Next steps", { font: "display", size: 17, color: NAVY, before: 20, after: 8 });
  report.nextSteps.forEach((step, index) => addText(`${String(index + 1).padStart(2, "0")}  ${step}`, { size: 9.5, color: INK, after: 6, width: CONTENT_WIDTH }));
  addText("Privacy and limitations", { font: "display", size: 17, color: NAVY, before: 17, after: 8 });
  report.limitations.forEach((limitation) => addText(limitation, { size: 8.5, color: MUTED, after: 4 }));
  footer();
  pageStreams.push(commands.join("\n"));
  pageHasImage.push(false);

  const pageCount = pageStreams.length;
  const objects: PdfObject[] = [
    `<< /Type /Catalog /Pages 3 0 R >>`,
    `<< /Title (${pdfString(`${report.title} · Cognirise Pulse`)}) /Author (Cognirise) /Subject (Personalised assessment report) /Creator (Cognirise Pulse; embedded Comfortaa display, Inter body and Noto Sans Arabic fallback) >>`,
    "",
  ];
  const addObject = (object: PdfObject): number => {
    objects.push(object);
    return objects.length;
  };
  const fontRefs: { display: number; body: number; arabic: number } = embeddedFonts
    ? { display: 0, body: 0, arabic: 0 }
    : { display: 5, body: 4, arabic: 4 };
  if (embeddedFonts) {
    for (const [role, font] of [["display", embeddedFonts.display], ["body", embeddedFonts.body], ["arabic", embeddedFonts.arabic]] as const) {
      const fontFile = addObject(concatBytes(
        encodeAscii(`<< /Length ${font.bytes.length} >>\nstream\n`),
        font.bytes,
        encodeAscii("\nendstream"),
      ));
      const descriptor = addObject(`<< /Type /FontDescriptor /FontName /${font.pdfName} /Flags 4 /FontBBox [0 -250 1200 1000] /ItalicAngle 0 /Ascent 900 /Descent -250 /CapHeight 700 /StemV 80 /FontFile2 ${fontFile} 0 R >>`);
      const widthValues = font.advances.map((advance) => Math.round((advance / font.unitsPerEm) * 1000)).join(" ");
      const cid = addObject(`<< /Type /Font /Subtype /CIDFontType2 /BaseFont /${font.pdfName} /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ${descriptor} 0 R /DW 500 /W [0 [${widthValues}]] /CIDToGIDMap /Identity >>`);
      const toUnicode = addObject(`<< /Length ${toUnicodeCmap(font).length} >>\nstream\n${toUnicodeCmap(font)}\nendstream`);
      const type0 = addObject(`<< /Type /Font /Subtype /Type0 /BaseFont /${font.pdfName} /Encoding /Identity-H /DescendantFonts [${cid} 0 R] /ToUnicode ${toUnicode} 0 R >>`);
      fontRefs[role] = type0;
    }
  } else {
    objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
    objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  }
  const imageId = imageObject ? addObject(imageObject) : 0;
  const pageObjectIds = pageStreams.map(() => addObject(""));
  const contentObjectIds = pageStreams.map(() => addObject(""));
  objects[2] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageCount} >>`;
  for (let index = 0; index < pageStreams.length; index += 1) {
    const imageResource = imageObject && index === 0 ? `/XObject << /Im1 ${imageId} 0 R >>` : "";
    const fontsResource = embeddedFonts
      ? `/FD ${fontRefs.display} 0 R /FB ${fontRefs.body} 0 R /FA ${fontRefs.arabic} 0 R`
      : `/F1 ${fontRefs.body} 0 R /F2 ${fontRefs.display} 0 R`;
    objects[pageObjectIds[index] - 1] = `<< /Type /Page /Parent 3 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << ${fontsResource} >> ${imageResource} >> /Contents ${contentObjectIds[index]} 0 R >>`;
    objects[contentObjectIds[index] - 1] = `<< /Length ${pageStreams[index].length} >>\nstream\n${pageStreams[index]}\nendstream`;
  }
  return makePdf(objects);
}

async function loadImage(path: string): Promise<Uint8Array | undefined> {
  if (typeof fetch === "undefined") return undefined;
  const response = await fetch(path, { credentials: "same-origin" });
  if (!response.ok) throw new Error(`The report artwork could not be loaded (${response.status}).`);
  return new Uint8Array(await response.arrayBuffer());
}

export function createPulseReportPdf(report: PulseReport, imageBytes?: Uint8Array): Uint8Array {
  return buildPdf(report, imageBytes);
}

export async function createPulseReportPdfAsync(report: PulseReport): Promise<Uint8Array> {
  const imageBytes = report.imagePath ? await loadImage(report.imagePath) : undefined;
  const embeddedFonts = await loadEmbeddedFonts();
  return buildPdf(report, imageBytes, embeddedFonts);
}

export async function downloadPulseReportPdf(report: PulseReport): Promise<void> {
  if (typeof document === "undefined" || typeof URL === "undefined") {
    throw new Error("PDF download is only available in a browser.");
  }
  const bytes = await createPulseReportPdfAsync(report);
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = report.filename ?? `cognirise-${report.methodId}-results.pdf`;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}