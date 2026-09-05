import { Router, type IRouter } from "express";
import healthRouter from "./health";
import enquiriesRouter from "./enquiries";
import cmsRouter from "./cms";
import cmsAssistantRouter from "./cms-assistant";

const router: IRouter = Router();

router.use(healthRouter);
router.use(enquiriesRouter);
router.use(cmsRouter);
router.use(cmsAssistantRouter);

export default router;
