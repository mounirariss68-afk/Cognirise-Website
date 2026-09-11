type Collection = "website" | "linkedin" | "motion";
const STILL_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "application/pdf"];
const MOTION_TYPES = ["video/mp4", "video/webm"];

export function validateIntake(files: File[], collection: Collection) {
  const accepted: File[] = [];
  const errors: string[] = [];
  const motion = collection === "motion";
  for (const file of files) {
    if (file.webkitRelativePath?.includes("/")) errors.push(`${file.name}: folders are not supported.`);
    else if (!(motion ? MOTION_TYPES : STILL_TYPES).includes(file.type)) errors.push(`${file.name}: unsupported type for ${collection}.`);
    else if (file.size === 0) errors.push(`${file.name}: empty files cannot be uploaded.`);
    else if (file.size > (motion ? 250 : 50) * 1024 ** 2) errors.push(`${file.name}: exceeds the ${motion ? 250 : 50} MiB limit.`);
    else accepted.push(file);
  }
  return { files: accepted, errors };
}

/** Never use a recursive directory enumerator for a media drop. */
export function droppedFiles(transfer: DataTransfer) {
  const files: File[] = [];
  const errors: string[] = [];
  if (transfer.items?.length) {
    for (const item of Array.from(transfer.items)) {
      if (item.kind !== "file") continue;
      const entry = item.webkitGetAsEntry?.();
      if (entry?.isDirectory) {
        errors.push(`${entry.name || "Dropped folder"}: folders are not supported. Select individual files.`);
        continue;
      }
      const file = item.getAsFile();
      if (file) files.push(file);
      else errors.push("A dropped item could not be read. Use Browse files instead.");
    }
  } else files.push(...Array.from(transfer.files));
  return { files, errors };
}