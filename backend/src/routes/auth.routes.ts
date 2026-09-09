import { Router } from "express";
import {
  changePassword,
  getMe,
  login,
  register,
  updateMe,
} from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.get("/me", authMiddleware, getMe);
router.patch("/me", authMiddleware, updateMe);
router.patch("/change-password", authMiddleware, changePassword);

router.post("/register", register);
router.post("/login", login);

export default router;
