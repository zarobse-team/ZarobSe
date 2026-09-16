import { Router } from "express";

import {
  createJob,
  deleteJob,
  getJobById,
  getJobs,
  getMyJobs,
  updateJob,
} from "../controllers/jobs.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.get("/", authMiddleware, getJobs);
router.get("/my", authMiddleware, getMyJobs);
router.get("/:id", authMiddleware, getJobById);

router.post("/", authMiddleware, createJob);
router.patch("/:id", authMiddleware, updateJob);
router.delete("/:id", authMiddleware, deleteJob);

export default router;
