import mongoose from "mongoose";

const CategorySchema = new mongoose.Schema(
  {
    category_id: { type: Number, unique: true, sparse: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true }
  },
  { timestamps: true }
);

export const Category = mongoose.model("Category", CategorySchema);
