const { Router } = require("express");
const { googleCallback, startGoogleAuth } = require("../controllers/auth.controller.js");

const router = Router();

router.get("/google", startGoogleAuth);
router.get("/google/callback", googleCallback);

module.exports = router;


