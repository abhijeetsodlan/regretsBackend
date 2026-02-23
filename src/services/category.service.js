const { Category } = require("../models/category.model.js");

const DEFAULT_CATEGORIES = [
  { category_id: 1001, name: "Love", slug: "love" },
  { category_id: 1002, name: "Career", slug: "career" },
  { category_id: 1003, name: "Family", slug: "family" },
  { category_id: 1004, name: "Health", slug: "health" },
  { category_id: 1005, name: "Money", slug: "money" },
  { category_id: 1006, name: "Life", slug: "life" }
];

async function ensureDefaultCategories() {
  const count = await Category.countDocuments();
  if (count > 0) {
    await backfillCategoryIds();
    return;
  }

  await Category.insertMany(DEFAULT_CATEGORIES);
}

function slugifyCategoryName(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function backfillCategoryIds() {
  const missing = await Category.find({ category_id: { $exists: false } })
    .sort({ createdAt: 1 })
    .select("_id")
    .lean();
  if (missing.length === 0) {
    return;
  }

  const maxRow = await Category.findOne().sort({ category_id: -1 }).select("category_id").lean();
  let nextId = typeof maxRow?.category_id === "number" ? maxRow.category_id + 1 : 1001;

  for (const row of missing) {
    await Category.updateOne({ _id: row._id }, { $set: { category_id: nextId } });
    nextId += 1;
  }
}

module.exports = { ensureDefaultCategories, slugifyCategoryName };


