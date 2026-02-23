const mongoose = require("mongoose");

const FeedbackSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["review", "suggestion", "general"],
      default: "general"
    },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    contact_email: { type: String, default: "", trim: true, lowercase: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true }
);

FeedbackSchema.index({ createdAt: -1 });

const Feedback = mongoose.model("Feedback", FeedbackSchema);

module.exports = { Feedback };


