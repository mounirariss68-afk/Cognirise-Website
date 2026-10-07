// Owner-confirmed launch contact details; retain CMS records for editorial handover.
export const CONTACT_EMAIL = "support@cognirise.ai";
export const CONFIRMED_OFFICES = [
  { city: "London", address: "34-37 Liverpool St, London EC2M 7PP, United Kingdom", order: 40 },
  { city: "Amsterdam", address: "Keizersgracht 452, Amsterdam, Netherlands", order: 50 },
];

export function launchContactOffices(offices: { city: string; address: string; phone?: string; order: number }[]) {
  const result = offices.map(office => {
    const confirmed = CONFIRMED_OFFICES.find(item => item.city.toLowerCase() === office.city.trim().toLowerCase());
    return confirmed ? { ...office, city: confirmed.city, address: confirmed.address } : office;
  });
  for (const office of CONFIRMED_OFFICES) {
    if (!result.some(item => item.city === office.city)) result.push(office);
  }
  return result;
}
