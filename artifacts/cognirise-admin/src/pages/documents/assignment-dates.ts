/** datetime-local is a wall-clock value in the browser's timezone, not UTC. */
export function localAssignmentDate(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function savedAssignmentDate(local: string, original?: string | null): string | null {
  if (!local) return null;
  // Preserve seconds and DST-fold identity when only another field changed.
  if (original && local === localAssignmentDate(original)) return original;
  return new Date(local).toISOString();
}