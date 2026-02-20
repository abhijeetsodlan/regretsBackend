import { Router } from "express";
import { logout, savePost } from "../controllers/session.controller.js";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.post("/logout", logout);
router.post("/savepost", requireAuth, savePost);

export default router;
