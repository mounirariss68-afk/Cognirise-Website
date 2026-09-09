export type HeroAssetRecord = {
  id: string;
  versionId: string;
  filename: string;
  mimeType: string;
  status: string;
};

export type HeroAssetSelection = {
  poster: HeroAssetRecord | null;
  mp4: HeroAssetRecord | null;
  webm: HeroAssetRecord | null;
};

export const EMPTY_HERO_SELECTION: HeroAssetSelection = {
  poster: null,
  mp4: null,
  webm: null,
};

export function mergeHeroAssetRecords(
  retained: ReadonlyMap<string, HeroAssetRecord>,
  incoming: readonly HeroAssetRecord[],
) {
  const merged = new Map(retained);
  for (const asset of incoming) {
    if (asset.status === "ready" && asset.versionId) merged.set(asset.id, asset);
  }
  return merged;
}

export function heroSelectionIssues(selection: HeroAssetSelection) {
  const missing = ([
    ["poster", "poster image"],
    ["mp4", "MP4 source"],
    ["webm", "WebM source"],
  ] as const)
    .filter(([role]) => !selection[role]?.versionId)
    .map(([, label]) => label);
  const records = Object.values(selection).filter((asset): asset is HeroAssetRecord => Boolean(asset));
  const duplicate = new Set(records.map((asset) => asset.id)).size !== records.length;
  const typeMismatch = (
    (selection.poster && !selection.poster.mimeType.startsWith("image/"))
    || (selection.mp4 && selection.mp4.mimeType !== "video/mp4")
    || (selection.webm && selection.webm.mimeType !== "video/webm")
  );
  return [
    ...(missing.length ? [`Choose a ${missing.join(", ")}.`] : []),
    ...(duplicate ? ["Poster, MP4, and WebM must be different assets."] : []),
    ...(typeMismatch ? ["Selected media types do not match their hero roles."] : []),
  ];
}

export function buildHeroDraftContent(page: "homepage" | "industries", selection: HeroAssetSelection) {
  const issues = heroSelectionIssues(selection);
  if (issues.length) throw new Error(issues.join(" "));
  const { poster, mp4, webm } = selection;
  if (!poster || !mp4 || !webm) throw new Error("Hero media selection is incomplete.");
  return {
    content: {
      schemaVersion: 1,
      page,
      hero: {
        posterMediaId: poster.id,
        posterMediaVersionId: poster.versionId,
        sources: [
          { mediaId: mp4.id, mediaVersionId: mp4.versionId, mimeType: "video/mp4" as const },
          { mediaId: webm.id, mediaVersionId: webm.versionId, mimeType: "video/webm" as const },
        ],
      },
    },
    mediaIds: [poster.id, mp4.id, webm.id],
  };
}