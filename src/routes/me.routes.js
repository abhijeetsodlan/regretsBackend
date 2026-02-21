import { Router } from "express";
import { getMe, updateMe, updateMyAvatar } from "../controllers/me.controller.js";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.get("/me", requireAuth, getMe);
router.patch("/me", requireAuth, updateMe);
router.patch("/me/avatar", requireAuth, updateMyAvatar);

export default router;
