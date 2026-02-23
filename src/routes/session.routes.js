const { Router } = require("express");
const { logout, savePost } = require("../controllers/session.controller.js");
const { requireAuth } = require("../middlewares/auth.js");

const router = Router();

router.post("/logout", logout);
router.post("/savepost", requireAuth, savePost);

module.exports = router;


