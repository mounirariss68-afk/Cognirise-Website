export function stringListItems(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

export function addStringListItem(value: unknown): string[] {
  return [...stringListItems(value), ""];
}

export function changeStringListItem(value: unknown, index: number, next: string): string[] {
  return stringListItems(value).map((item, itemIndex) => itemIndex === index ? next : item);
}

export function removeStringListItem(value: unknown, index: number): string[] {
  return stringListItems(value).filter((_, itemIndex) => itemIndex !== index);
}