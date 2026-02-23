const mongoose = require("mongoose");

const LikeSchema = new mongoose.Schema(
  {
    question: { type: mongoose.Schema.Types.ObjectId, ref: "Question", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

LikeSchema.index({ question: 1, user: 1 }, { unique: true });

const Like = mongoose.model("Like", LikeSchema);

module.exports = { Like };


