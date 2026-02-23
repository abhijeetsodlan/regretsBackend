const { Router } = require("express");
const { csrfCookie } = require("../controllers/session.controller.js");

const router = Router();

router.get("/csrf-cookie", csrfCookie);

module.exports = router;


