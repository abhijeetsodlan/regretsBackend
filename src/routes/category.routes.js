import { Router } from "express";
import { createCategory, listCategories } from "../controllers/category.controller.js";
import { requireAuth } from "../middlewares/auth.js";
import { requireAdmin } from "../controllers/admin.controller.js";

const router = Router();

router.get("/categories", listCategories);
router.post("/categories", requireAuth, requireAdmin, createCategory);

export default router;
