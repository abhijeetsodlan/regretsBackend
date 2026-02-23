const { Router } = require("express");
const { createComment, listCommentsForQuestion } = require("../controllers/comment.controller.js");
const { requireAuth } = require("../middlewares/auth.js");

const router = Router();

router.get("/comments/:questionId", listCommentsForQuestion);
router.post("/comment", requireAuth, createComment);

module.exports = router;


