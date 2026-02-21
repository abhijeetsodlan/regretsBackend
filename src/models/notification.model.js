import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    question: { type: mongoose.Schema.Types.ObjectId, ref: "Question", required: true },
    comment: { type: mongoose.Schema.Types.ObjectId, ref: "Comment", default: null },
    type: {
      type: String,
      enum: ["regret_liked", "regret_replied", "participant_replied"],
      required: true
    },
    message: { type: String, required: true, trim: true },
    is_read: { type: Boolean, default: false }
  },
  { timestamps: true }
);

NotificationSchema.index({ user: 1, is_read: 1, createdAt: -1 });

export const Notification = mongoose.model("Notification", NotificationSchema);

