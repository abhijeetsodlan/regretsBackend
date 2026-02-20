import { Router } from "express";
import { myProfile } from "../controllers/profile.controller.js";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.post("/myprofile", requireAuth, myProfile);

export default router;

