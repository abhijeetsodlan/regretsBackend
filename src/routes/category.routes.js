const { Router } = require("express");
const { createCategory, listCategories } = require("../controllers/category.controller.js");
const { requireAuth } = require("../middlewares/auth.js");
const { requireAdmin } = require("../controllers/admin.controller.js");

const router = Router();

router.get("/categories", listCategories);
router.post("/categories", requireAuth, requireAdmin, createCategory);

module.exports = router;


