import { readFile } from "node:fs/promises";
import path from "node:path";
import { CASE_CINEMATIC_VISUALS, caseStudyRecords } from "./case-studies.js";
import { websiteRoot } from "./common.js";

function jpegDimensions(bytes: Buffer) {
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) { offset++; continue; }
    const marker = bytes[offset + 1];
    const length = bytes.readUInt16BE(offset + 2);
    if (marker >= 0xc0 && marker <= 0xc3) {
      return { width: bytes.readUInt16BE(offset + 7), height: bytes.readUInt16BE(offset + 5) };
    }
    offset += 2 + length;
  }
  throw new Error("JPEG dimensions could not be read.");
}

async function main() {
  const records = caseStudyRecords();
  if (records.length !== CASE_CINEMATIC_VISUALS.length) {
    throw new Error("Cinematic visual briefs do not match the governed case-study count.");
  }

  await Promise.all(CASE_CINEMATIC_VISUALS.map(async (visual, index) => {
    const mediaPath = (records[index].fields.mediaPaths as string[])[0];
    const expectedPath = `/images/cognirise/cases/cinematic/${visual.filename}`;
    if (mediaPath !== expectedPath) throw new Error(`Case ${index + 1} does not point to its cinematic artwork.`);
    const bytes = await readFile(path.join(websiteRoot, "public", mediaPath));
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error(`${visual.filename} is not a JPEG.`);
    const { width, height } = jpegDimensions(bytes);
    if (width !== 1600 || height !== 1000) throw new Error(`${visual.filename} must be 1600 by 1000.`);
  }));

  console.log(`Verified ${records.length} commissioned cinematic case-study images.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});