import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateRawSync } from "node:zlib";
import {
  archiveName,
  expectedArchiveFiles,
} from "./linkedin-bundle-manifest.mjs";

const assetDirectory = fileURLToPath(
  new URL("../public/images/cognirise/linkedin/", import.meta.url),
);

const crcTable = Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) {
    crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return crc >>> 0;
});

const crc32 = (buffer) => {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const localParts = [];
const centralParts = [];
let offset = 0;

for (const file of expectedArchiveFiles) {
  const name = Buffer.from(file, "utf8");
  const contents = readFileSync(join(assetDirectory, file));
  const compressed = deflateRawSync(contents, { level: 9 });
  const checksum = crc32(contents);

  const localHeader = Buffer.alloc(30);
  localHeader.writeUInt32LE(0x04034b50, 0);
  localHeader.writeUInt16LE(20, 4);
  localHeader.writeUInt16LE(0x0800, 6);
  localHeader.writeUInt16LE(8, 8);
  localHeader.writeUInt16LE(0, 10);
  localHeader.writeUInt16LE(0x0021, 12);
  localHeader.writeUInt32LE(checksum, 14);
  localHeader.writeUInt32LE(compressed.length, 18);
  localHeader.writeUInt32LE(contents.length, 22);
  localHeader.writeUInt16LE(name.length, 26);
  localHeader.writeUInt16LE(0, 28);
  localParts.push(localHeader, name, compressed);

  const centralHeader = Buffer.alloc(46);
  centralHeader.writeUInt32LE(0x02014b50, 0);
  centralHeader.writeUInt16LE(0x0314, 4);
  centralHeader.writeUInt16LE(20, 6);
  centralHeader.writeUInt16LE(0x0800, 8);
  centralHeader.writeUInt16LE(8, 10);
  centralHeader.writeUInt16LE(0, 12);
  centralHeader.writeUInt16LE(0x0021, 14);
  centralHeader.writeUInt32LE(checksum, 16);
  centralHeader.writeUInt32LE(compressed.length, 20);
  centralHeader.writeUInt32LE(contents.length, 24);
  centralHeader.writeUInt16LE(name.length, 28);
  centralHeader.writeUInt16LE(0, 30);
  centralHeader.writeUInt16LE(0, 32);
  centralHeader.writeUInt16LE(0, 34);
  centralHeader.writeUInt16LE(0, 36);
  centralHeader.writeUInt32LE((0o100644 << 16) >>> 0, 38);
  centralHeader.writeUInt32LE(offset, 42);
  centralParts.push(centralHeader, name);

  offset += localHeader.length + name.length + compressed.length;
}

const centralDirectory = Buffer.concat(centralParts);
const endRecord = Buffer.alloc(22);
endRecord.writeUInt32LE(0x06054b50, 0);
endRecord.writeUInt16LE(0, 4);
endRecord.writeUInt16LE(0, 6);
endRecord.writeUInt16LE(expectedArchiveFiles.length, 8);
endRecord.writeUInt16LE(expectedArchiveFiles.length, 10);
endRecord.writeUInt32LE(centralDirectory.length, 12);
endRecord.writeUInt32LE(offset, 16);
endRecord.writeUInt16LE(0, 20);

writeFileSync(
  join(assetDirectory, archiveName),
  Buffer.concat([...localParts, centralDirectory, endRecord]),
);

console.log(
  `Packaged ${archiveName} with ${expectedArchiveFiles.length} deterministic entries.`,
);