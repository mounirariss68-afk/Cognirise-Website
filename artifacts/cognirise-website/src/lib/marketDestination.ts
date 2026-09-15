export function marketAwareDestination(href: string, market: string, locale: string) {
  const destination = new URL(href, "https://cognirise.ai");
  destination.searchParams.set("market", market);
  destination.searchParams.set("locale", locale);
  return `${destination.pathname}${destination.search}${destination.hash}`;
}