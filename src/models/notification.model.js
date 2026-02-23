const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    question: { type: mongoose.Schema.Types.ObjectId, ref: "Question", default: null },
    comment: { type: mongoose.Schema.Types.ObjectId, ref: "Comment", default: null },
    type: {
      type: String,
      enum: ["regret_liked", "regret_replied", "participant_replied", "admin_message"],
      required: true
    },
    message: { type: String, required: true, trim: true },
    is_read: { type: Boolean, default: false }
  },
  { timestamps: true }
);

NotificationSchema.index({ user: 1, is_read: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", NotificationSchema);

module.exports = { Notification };


