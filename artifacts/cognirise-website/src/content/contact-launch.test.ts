import assert from "node:assert/strict";
import test from "node:test";
import { CONTACT_EMAIL, CONFIRMED_OFFICES, launchContactOffices } from "./contact-launch";

test("confirmed contact details replace stale addresses without removing other offices", () => {
  const dubai = { city: "Dubai", address: "Existing office", order: 1 };
  const offices = launchContactOffices([
    dubai,
    { city: " london ", address: "The City, United Kingdom", phone: "123", order: 2 },
  ]);
  assert.equal(CONTACT_EMAIL, "support@cognirise.ai");
  assert.deepEqual(offices.find(o => o.city === "Dubai"), dubai);
  assert.equal(offices.find(o => o.city === "London")?.address, CONFIRMED_OFFICES[0].address);
  assert.equal(offices.find(o => o.city === "London")?.phone, "123");
  assert.equal(offices[0].address, CONFIRMED_OFFICES[1].address);
  assert.deepEqual(launchContactOffices(offices), offices);
});

test("Istanbul is inserted once and normalized duplicates are sorted by city, not order", () => {
  const source = [
    { city: "Riyadh", address: "Retained Riyadh", order: 0 },
    { city: "Dubai", address: "Retained Dubai", order: 1 },
    { city: " istanbul ", address: "Old location", order: 2 },
    { city: "İSTANBUL", address: "Duplicate", order: 3 },
    { city: "LONDON", address: "Old London", order: 4 },
    { city: " london ", address: "Duplicate", phone: "123", order: 5 },
  ];
  const before = structuredClone(source);
  const result = launchContactOffices(source);
  assert.deepEqual(result.map(o => o.city), ["Amsterdam", "Dubai", "Istanbul", "London", "Riyadh"]);
  assert.equal(result[2].address, "Boğaziçi Teknopark, Istanbul, Türkiye");
  assert.equal(result[2].phone, undefined);
  assert.equal(result[3].phone, "123");
  assert.deepEqual(source, before);
});
