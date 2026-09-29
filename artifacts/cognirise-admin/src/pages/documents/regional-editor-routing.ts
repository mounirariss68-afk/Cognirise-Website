export function regionalEditorHref(context: string, market: string, locale: string) {
  const query = new URLSearchParams({ context, market, locale });
  return `/regional-editor?${query}`;
}