import { Router, type IRouter } from "express";
import { and, eq, gt } from "drizzle-orm";
import { db, readinessAssessmentsTable } from "@workspace/db";
import {
  DeleteReadinessAssessmentHeader,
  DeleteReadinessAssessmentParams,
  GetReadinessAssessmentParams,
  GetReadinessAssessmentResponse,
} from "@workspace/api-zod";
import { asyncRoute } from "../lib/http";
import { hashToken } from "../lib/security";

const router: IRouter = Router();

function publicRecord(record: typeof readinessAssessmentsTable.$inferSelect) {
  return {
    id: record.id,
    answers: record.answers,
    decision: record.decision,
    unresolvedConditionIds: record.unresolvedConditionIds,
    createdAt: record.createdAt,
    expiresAt: record.expiresAt,
  };
}

// Anonymous creation is retired. Keep the endpoint as an explicit tombstone so
// old clients do not mistake the policy change for a transient server failure.
router.post("/public/readiness-assessments", (_req, res) => {
  res.status(410).json({ error: "Anonymous readiness saves are no longer available." });
});

router.get("/public/readiness-assessments/:id", asyncRoute(async (req, res) => {
  const params = GetReadinessAssessmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(404).json({ error: "Saved readiness decision not found." });
    return;
  }
  const [record] = await db.select().from(readinessAssessmentsTable).where(and(
    eq(readinessAssessmentsTable.id, params.data.id),
    gt(readinessAssessmentsTable.expiresAt, new Date()),
  )).limit(1);
  if (!record) {
    res.status(404).json({ error: "Saved readiness decision not found or expired." });
    return;
  }
  res.json(GetReadinessAssessmentResponse.parse(publicRecord(record)));
}));

router.delete("/public/readiness-assessments/:id", asyncRoute(async (req, res) => {
  const params = DeleteReadinessAssessmentParams.safeParse(req.params);
  const headers = DeleteReadinessAssessmentHeader.safeParse({
    "X-Delete-Token": req.header("X-Delete-Token"),
  });
  if (!params.success) {
    res.status(404).json({ error: "Saved readiness decision not found." });
    return;
  }
  if (!headers.success) {
    res.status(403).json({ error: "Deletion permission is required." });
    return;
  }
  const [deleted] = await db.delete(readinessAssessmentsTable).where(and(
    eq(readinessAssessmentsTable.id, params.data.id),
    eq(readinessAssessmentsTable.deleteTokenHash, hashToken(headers.data["X-Delete-Token"])),
  )).returning({ id: readinessAssessmentsTable.id });
  if (!deleted) {
    res.status(403).json({ error: "Deletion permission is invalid." });
    return;
  }
  res.sendStatus(204);
}));

export default router;