const { Router } = require("express");
const { myProfile } = require("../controllers/profile.controller.js");
const { requireAuth } = require("../middlewares/auth.js");

const router = Router();

router.post("/myprofile", requireAuth, myProfile);

module.exports = router;


