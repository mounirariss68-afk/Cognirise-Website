import { Router, type IRouter } from "express";
import healthRouter from "./health";
import enquiriesRouter from "./enquiries";
import cmsRouter from "./cms";
import cmsAssistantRouter from "./cms-assistant";
import cmsMediaRouter from "./cms-media";

const router: IRouter = Router();

router.use(healthRouter);
router.use(enquiriesRouter);
router.use(cmsRouter);
router.use(cmsAssistantRouter);
router.use(cmsMediaRouter);

export default router;
