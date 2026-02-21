import { Router } from "express";
import { createFeedback } from "../controllers/feedback.controller.js";
import { optionalAuth } from "../middlewares/auth.js";

const router = Router();

router.post("/feedback", optionalAuth, createFeedback);

export default router;

