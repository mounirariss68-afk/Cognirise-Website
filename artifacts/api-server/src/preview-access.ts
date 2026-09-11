/** Pending assets are review material, not shareable preview collateral. */
export function canAccessPendingPreviewMedia(role: string | null | undefined) {
  return role === "editor" || role === "publisher" || role === "administrator";
}