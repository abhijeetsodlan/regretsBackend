import { Router } from "express";
import { googleCallback, startGoogleAuth } from "../controllers/auth.controller.js";

const router = Router();

router.get("/google", startGoogleAuth);
router.get("/google/callback", googleCallback);

export default router;
