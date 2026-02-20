import { Router } from "express";
import { createCategory, listCategories } from "../controllers/category.controller.js";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.get("/categories", listCategories);
router.post("/categories", requireAuth, createCategory);

export default router;
