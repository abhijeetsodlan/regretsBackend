const { Router } = require("express");
const { createFeedback } = require("../controllers/feedback.controller.js");
const { optionalAuth } = require("../middlewares/auth.js");

const router = Router();

router.post("/feedback", optionalAuth, createFeedback);

module.exports = router;


