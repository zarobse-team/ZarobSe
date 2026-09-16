import { Router } from "express";

import { getPublicUserProfile } from "../controllers/users.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.get("/:id", authMiddleware, getPublicUserProfile);

export default router;
