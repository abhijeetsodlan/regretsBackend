import mongoose from "mongoose";

const QuestionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    is_anonymous: { type: Boolean, default: false },
    shares_count: { type: Number, default: 0, min: 0 }
  },
  { timestamps: true }
);

export const Question = mongoose.model("Question", QuestionSchema);
