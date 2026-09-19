import { Router, type IRouter } from "express";
import healthRouter from "./health";
import enquiriesRouter from "./enquiries";
import authRouter from "./auth";
import documentsRouter from "./documents";
import adminRouter from "./admin";
import submissionsRouter from "./submissions";
import publicRouter from "./public";
import analyticsRouter from "./analytics";
import mediaRouter from "./media";
import navigationRouter from "./navigation";
import readinessAssessmentsRouter from "./readiness-assessments";
import editorialWorkRouter from "./editorial-work";
import releasesRouter from "./releases";

const router: IRouter = Router();

router.use(healthRouter);
router.use(enquiriesRouter);
router.use(authRouter);
router.use(documentsRouter);
router.use(adminRouter);
router.use(submissionsRouter);
router.use(publicRouter);
router.use(analyticsRouter);
router.use(mediaRouter);
router.use(navigationRouter);
router.use(readinessAssessmentsRouter);
router.use(editorialWorkRouter);
router.use(releasesRouter);

export default router;
