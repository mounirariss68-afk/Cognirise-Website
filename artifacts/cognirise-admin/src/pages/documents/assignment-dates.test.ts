import assert from "node:assert/strict";
import test from "node:test";
import { localAssignmentDate, savedAssignmentDate } from "./assignment-dates";

test("due dates display and round-trip in a non-UTC timezone", () => {
  const previous = process.env.TZ;
  process.env.TZ = "Asia/Dubai";
  try {
    const instant = "2027-01-15T12:30:42.123Z";
    assert.equal(localAssignmentDate(instant), "2027-01-15T16:30");
    assert.equal(savedAssignmentDate(localAssignmentDate(instant), instant), instant);
    assert.equal(savedAssignmentDate("2027-01-15T17:30", instant), "2027-01-15T13:30:00.000Z");
    assert.equal(savedAssignmentDate("", instant), null);
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});