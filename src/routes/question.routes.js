import { Router } from "express";
import {
  createQuestion,
  getQuestion,
  listQuestions,
  listQuestionsByCategory,
  toggleLikeQuestion,
  updateQuestion
} from "../controllers/question.controller.js";
import { optionalAuth, requireAuth } from "../middlewares/auth.js";

const router = Router();

router.get("/questions", optionalAuth, listQuestions);
router.get("/questions/category/:categoryId", optionalAuth, listQuestionsByCategory);
router.get("/questions/:id", optionalAuth, getQuestion);
router.post("/question", requireAuth, createQuestion);
router.patch("/questions/:id", requireAuth, updateQuestion);
router.post("/questions/:id/like", requireAuth, toggleLikeQuestion);

export default router;
