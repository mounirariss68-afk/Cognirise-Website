import { basename } from "node:path";

const minimumEmbeddedImageBytes = 10_000;

const fail = (message) => {
  throw new Error(`LinkedIn export integrity check failed: ${message}`);
};

function readPngDimensionsFromBuffer(png, label) {
  const signature = "89504e470d0a1a0a";
  if (png.length < 24 || png.subarray(0, 8).toString("hex") !== signature) {
    fail(`${label} has an invalid PNG signature`);
  }
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

const readJpegDimensions = (image, label) => {
  if (image.length < 4 || image[0] !== 0xff || image[1] !== 0xd8) {
    fail(`${label} has an invalid JPEG signature`);
  }

  let offset = 2;
  while (offset + 9 < image.length) {
    if (image[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = image[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > image.length) break;

    const segmentLength = image.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > image.length) {
      fail(`${label} has a malformed JPEG segment`);
    }

    if (
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf)
    ) {
      return {
        width: image.readUInt16BE(offset + 5),
        height: image.readUInt16BE(offset + 3),
      };
    }
    offset += segmentLength;
  }

  fail(`${label} does not contain JPEG dimensions`);
};

const validateEmbeddedImage = (href, svgFile) => {
  const match = href.match(/^data:(image\/(?:jpeg|png));base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match) fail(`${svgFile} contains a malformed or unsupported embedded image`);

  const [, mimeType, encoded] = match;
  const image = Buffer.from(encoded, "base64");
  if (image.length < minimumEmbeddedImageBytes) {
    fail(`${svgFile} contains an implausibly small embedded image (${image.length} bytes)`);
  }

  const normalizedInput = encoded.replace(/=+$/, "");
  const normalizedOutput = image.toString("base64").replace(/=+$/, "");
  if (normalizedOutput !== normalizedInput) fail(`${svgFile} contains invalid base64 image data`);

  const dimensions =
    mimeType === "image/jpeg"
      ? readJpegDimensions(image, `${svgFile} embedded image`)
      : readPngDimensionsFromBuffer(image, `${svgFile} embedded image`);
  if (dimensions.width < 1000 || dimensions.height < 396) {
    fail(
      `${svgFile} embedded image is only ${dimensions.width}×${dimensions.height}; expected Pulse artwork at production scale`,
    );
  }
};

export const validateSvgImages = (svg, svgFile) => {
  const imageElements = svg.match(/<image\b[^>]*>/gi) ?? [];
  if (imageElements.length === 0) fail(`${svgFile} does not contain an embedded Pulse image`);

  for (const imageElement of imageElements) {
    const href = imageElement.match(/\b(?:href|xlink:href)\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!href) fail(`${svgFile} contains an image without an href`);
    validateEmbeddedImage(href, svgFile);
  }
};

export const readPngDimensions = (png, file) =>
  readPngDimensionsFromBuffer(png, basename(file));