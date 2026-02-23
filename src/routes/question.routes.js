const { Router } = require("express");
const {
  createQuestion,
  getQuestion,
  listQuestions,
  listQuestionsByCategory,
  trackQuestionShare,
  toggleLikeQuestion,
  updateQuestion
} = require("../controllers/question.controller.js");
const { optionalAuth, requireAuth } = require("../middlewares/auth.js");

const router = Router();

router.get("/questions", optionalAuth, listQuestions);
router.get("/questions/category/:categoryId", optionalAuth, listQuestionsByCategory);
router.get("/questions/:id", optionalAuth, getQuestion);
router.post("/question", requireAuth, createQuestion);
router.patch("/questions/:id", requireAuth, updateQuestion);
router.post("/questions/:id/like", requireAuth, toggleLikeQuestion);
router.post("/questions/:id/share", optionalAuth, trackQuestionShare);

module.exports = router;


