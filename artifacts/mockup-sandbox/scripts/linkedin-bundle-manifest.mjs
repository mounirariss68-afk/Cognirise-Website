export const archiveName = "cognirise-linkedin-pulse-image-led-edition.zip";
export const readmeName = "readme.md";

export const imageLedSvgFiles = [
  "cognirise-linkedin-action.svg",
  "cognirise-linkedin-governance.svg",
  "cognirise-linkedin-header-governance.svg",
  "cognirise-linkedin-header-judgment.svg",
  "cognirise-linkedin-header-rhythm.svg",
  "cognirise-linkedin-judgment.svg",
  "cognirise-linkedin-knowledge.svg",
  "cognirise-linkedin-orchestration.svg",
  "cognirise-linkedin-transformation.svg",
].sort();

export const expectedPngFiles = imageLedSvgFiles.map((file) =>
  file.replace(/\.svg$/, ".png"),
);

export const expectedArchiveFiles = [
  ...imageLedSvgFiles,
  ...expectedPngFiles,
  readmeName,
].sort();