import { Router } from "express";

import {
  acceptApplication,
  applyToJob,
  getApplicationsForJob,
  getMyApplicationForJob,
  getMyApplications,
  withdrawApplication,
} from "../controllers/jobApplications.controller";

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

router.get("/applications/my", authMiddleware, getMyApplications);

router.get("/:id/applications", authMiddleware, getApplicationsForJob);

router.get("/:id/application", authMiddleware, getMyApplicationForJob);

router.get("/:id", authMiddleware, getJobById);

router.post("/", authMiddleware, createJob);

router.post("/:id/apply", authMiddleware, applyToJob);

router.delete("/:id/application", authMiddleware, withdrawApplication);

router.patch(
  "/applications/:applicationId/accept",
  authMiddleware,
  acceptApplication,
);

router.patch("/:id", authMiddleware, updateJob);

router.delete("/:id", authMiddleware, deleteJob);

export default router;
