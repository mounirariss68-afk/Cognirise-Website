// Owner-confirmed launch contact details; retain CMS records for editorial handover.
export const CONTACT_EMAIL = "support@cognirise.ai";
export const CONFIRMED_OFFICES = [
  { city: "London", address: "34-37 Liverpool St, London EC2M 7PP, United Kingdom", order: 40 },
  { city: "Amsterdam", address: "Keizersgracht 452, Amsterdam, Netherlands", order: 50 },
  { city: "Istanbul", address: "Boğaziçi Teknopark, Istanbul, Türkiye", order: 60 },
];

type ContactOffice = { city: string; address: string; phone?: string; order: number };
const cityKey = (city: string) => city.normalize("NFKC").trim().toLocaleLowerCase("en").replace(/\u0307/g, "");

export function sortedContactOffices(offices: ContactOffice[]) {
  const unique = new Map<string, ContactOffice>();
  for (const office of offices) {
    const key = cityKey(office.city);
    const previous = unique.get(key);
    if (!previous) unique.set(key, office);
    else if (!previous.phone && office.phone) unique.set(key, { ...previous, phone: office.phone });
  }
  return [...unique.values()].sort((a, b) => a.city.trim().localeCompare(b.city.trim(), "en"));
}

export function launchContactOffices(offices: { city: string; address: string; phone?: string; order: number }[]) {
  const result = offices.map(office => {
    const confirmed = CONFIRMED_OFFICES.find(item => cityKey(item.city) === cityKey(office.city));
    return confirmed ? { ...office, city: confirmed.city, address: confirmed.address } : office;
  });
  for (const office of CONFIRMED_OFFICES) {
    if (!result.some(item => item.city === office.city)) result.push(office);
  }
  return sortedContactOffices(result);
}
