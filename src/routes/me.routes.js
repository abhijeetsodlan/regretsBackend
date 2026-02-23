const { Router } = require("express");
const { getMe, updateMe, updateMyAvatar } = require("../controllers/me.controller.js");
const { requireAuth } = require("../middlewares/auth.js");

const router = Router();

router.get("/me", requireAuth, getMe);
router.patch("/me", requireAuth, updateMe);
router.patch("/me/avatar", requireAuth, updateMyAvatar);

module.exports = router;


