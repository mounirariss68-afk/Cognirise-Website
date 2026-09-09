export type OfficeCreationValues = {
  title: string;
  address?: string;
  phone?: string;
};

export function officeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function officeCreationContent(values: OfficeCreationValues) {
  const phone = values.phone?.trim();
  return {
    schemaVersion: 1 as const,
    city: values.title.trim(),
    address: values.address?.trim() ?? "",
    ...(phone ? { phone } : {}),
  };
}