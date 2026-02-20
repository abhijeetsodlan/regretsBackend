import { Category } from "../models/category.model.js";
import { ensureDefaultCategories, slugifyCategoryName } from "../services/category.service.js";

export async function listCategories(req, res, next) {
  try {
    await ensureDefaultCategories();
    const categories = await Category.find().sort({ name: 1 }).lean();
    res.json({
      data: categories.map((category) => ({
        id: category.category_id,
        name: category.name,
        slug: category.slug
      }))
    });
  } catch (err) {
    next(err);
  }
}

export async function createCategory(req, res, next) {
  try {
    const rawName = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    if (!rawName) {
      return res.status(400).json({ message: "name is required" });
    }

    const slug = slugifyCategoryName(rawName);
    if (!slug) {
      return res.status(400).json({ message: "invalid category name" });
    }

    const maxRow = await Category.findOne().sort({ category_id: -1 }).select("category_id").lean();
    const nextCategoryId = typeof maxRow?.category_id === "number" ? maxRow.category_id + 1 : 1001;

    const created = await Category.create({
      category_id: nextCategoryId,
      name: rawName,
      slug
    });

    return res.status(201).json({
      category: {
        id: created.category_id,
        name: created.name,
        slug: created.slug
      }
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: "category already exists" });
    }
    next(err);
  }
}
