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
  completeJob,
  createJob,
  deleteJob,
  getJobById,
  getJobs,
  getMyJobs,
  requestJobCompletion,
  startJob,
  updateJob,
} from "../controllers/jobs.controller";

import {
  getJobMessages,
  markJobMessagesAsRead,
  sendJobMessage,
} from "../controllers/chat.controller";

import {
  createReview,
  getMyReviewForJob,
} from "../controllers/reviews.controller";

import { cancelJob } from "../controllers/jobStatus.controller";

import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.get("/", authMiddleware, getJobs);

router.get("/my", authMiddleware, getMyJobs);

router.get("/applications/my", authMiddleware, getMyApplications);

router.get("/:id/applications", authMiddleware, getApplicationsForJob);

router.get("/:id/application", authMiddleware, getMyApplicationForJob);

router.get("/:id/messages", authMiddleware, getJobMessages);

router.post("/:id/messages", authMiddleware, sendJobMessage);

router.patch("/:id/messages/read", authMiddleware, markJobMessagesAsRead);

router.post("/:id/reviews", authMiddleware, createReview);

router.get("/:id/review", authMiddleware, getMyReviewForJob);

router.get("/:id", authMiddleware, getJobById);

router.post("/", authMiddleware, createJob);

router.post("/:id/apply", authMiddleware, applyToJob);

router.delete("/:id/application", authMiddleware, withdrawApplication);

router.patch(
  "/applications/:applicationId/accept",
  authMiddleware,
  acceptApplication,
);

router.patch("/:id/start", authMiddleware, startJob);

router.patch("/:id/request-completion", authMiddleware, requestJobCompletion);

router.patch("/:id/complete", authMiddleware, completeJob);

router.patch("/:id/cancel", authMiddleware, cancelJob);

router.patch("/:id", authMiddleware, updateJob);

router.delete("/:id", authMiddleware, deleteJob);

export default router;
