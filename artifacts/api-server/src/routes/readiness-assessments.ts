import { Router, type IRouter } from "express";
import { and, eq, gt } from "drizzle-orm";
import { db, readinessAssessmentsTable } from "@workspace/db";
import {
  CreateReadinessAssessmentBody,
  CreateReadinessAssessmentResponse,
  DeleteReadinessAssessmentHeader,
  DeleteReadinessAssessmentParams,
  GetReadinessAssessmentParams,
  GetReadinessAssessmentResponse,
} from "@workspace/api-zod";
import { asyncRoute, throttle } from "../lib/http";
import { hashToken, randomToken, SlidingWindowThrottle } from "../lib/security";

const router: IRouter = Router();
const CONDITION_IDS = [
  "stability",
  "access",
  "observability",
  "fallback",
  "exceptions",
  "economics",
] as const;
const RETENTION_DAYS = 90;
const createLimiter = new SlidingWindowThrottle(20, 60_000);

function deriveResult(answers: Record<string, string>) {
  const unresolvedConditionIds = CONDITION_IDS.filter((id) => answers[id] !== "ready");
  const decision = Object.values(answers).includes("stop")
    ? "stop"
    : unresolvedConditionIds.length === 0
      ? "proceed"
      : "prepare";
  return { decision, unresolvedConditionIds };
}

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

router.post(
  "/public/readiness-assessments",
  throttle(createLimiter, (req) => req.ip ?? "unknown"),
  asyncRoute(async (req, res) => {
    const parsed = CreateReadinessAssessmentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "A complete set of readiness answers is required." });
      return;
    }
    const deleteToken = randomToken();
    const expiresAt = new Date();
    expiresAt.setUTCDate(expiresAt.getUTCDate() + RETENTION_DAYS);
    const derived = deriveResult(parsed.data.answers);
    const [record] = await db.insert(readinessAssessmentsTable).values({
      answers: parsed.data.answers,
      decision: derived.decision,
      unresolvedConditionIds: [...derived.unresolvedConditionIds],
      deleteTokenHash: hashToken(deleteToken),
      expiresAt,
    }).returning();
    res.status(201).json(CreateReadinessAssessmentResponse.parse({
      ...publicRecord(record),
      deleteToken,
    }));
  }),
);

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