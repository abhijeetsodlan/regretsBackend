import { Router } from "express";
import { createComment, listCommentsForQuestion } from "../controllers/comment.controller.js";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.get("/comments/:questionId", listCommentsForQuestion);
router.post("/comment", requireAuth, createComment);

export default router;

