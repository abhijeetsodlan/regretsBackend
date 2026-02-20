import mongoose from "mongoose";

const CommentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    question: { type: mongoose.Schema.Types.ObjectId, ref: "Question", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    is_anonymous: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const Comment = mongoose.model("Comment", CommentSchema);

