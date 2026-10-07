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
  assert.deepEqual(offices[0], dubai);
  assert.equal(offices[1].address, CONFIRMED_OFFICES[0].address);
  assert.equal(offices[1].phone, "123");
  assert.equal(offices[2].address, CONFIRMED_OFFICES[1].address);
  assert.deepEqual(launchContactOffices(offices), offices);
});
