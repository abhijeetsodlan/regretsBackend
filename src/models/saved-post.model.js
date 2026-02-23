const mongoose = require("mongoose");

const SavedPostSchema = new mongoose.Schema(
  {
    question: { type: mongoose.Schema.Types.ObjectId, ref: "Question", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

SavedPostSchema.index({ question: 1, user: 1 }, { unique: true });

const SavedPost = mongoose.model("SavedPost", SavedPostSchema);

module.exports = { SavedPost };


