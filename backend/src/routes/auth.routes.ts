import { Router } from "express";
import {
  getMe,
  login,
  register,
  updateMe,
} from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.get("/me", authMiddleware, getMe);
router.patch("/me", authMiddleware, updateMe);

router.post("/register", register);
router.post("/login", login);

export default router;
