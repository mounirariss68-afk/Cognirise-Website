export function updateEducationPov(
  value: Record<string, any>,
  patch: Record<string, unknown>,
) {
  return { ...value, ...patch };
}