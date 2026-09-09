export function routePath(location: string) {
  return location.split(/[?#]/)[0];
}

export function isCurrentRouteDestination(itemHref: string, location: string, currentHash: string) {
  const [pathname, hash] = itemHref.split("#");
  if (routePath(location) !== pathname) return false;
  return hash ? currentHash === `#${hash}` : !currentHash;
}