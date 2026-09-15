import { Router } from "express";

import { createJob, getJobById, getJobs } from "../controllers/jobs.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.get("/", authMiddleware, getJobs);
router.get("/:id", authMiddleware, getJobById);
router.post("/", authMiddleware, createJob);

export default router;
