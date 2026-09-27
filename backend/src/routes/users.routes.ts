import { Router } from "express";

import { getUserReviews } from "../controllers/reviews.controller";
import { getPublicUserProfile } from "../controllers/users.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.get("/:id/reviews", authMiddleware, getUserReviews);

router.get("/:id", authMiddleware, getPublicUserProfile);

export default router;
