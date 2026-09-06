import assert from "node:assert/strict";
import test from "node:test";
import { cmsCorsOptions } from "./cors";

function permitted(options: ReturnType<typeof cmsCorsOptions>, origin: string) {
  return new Promise<boolean>((resolve, reject) => options.origin!(origin, (error, value) =>
    error ? reject(error) : resolve(value === true)));
}

test("CORS never reflects arbitrary origins and configured origins are non-credentialed", async () => {
  const options = cmsCorsOptions("https://review.example.test");
  assert.equal(options.credentials, false);
  assert.equal(await permitted(options, "https://attacker.example.test"), false);
  assert.equal(await permitted(options, "https://review.example.test"), true);
});