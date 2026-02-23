const mongoose = require("mongoose");

const NightRoomReplySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    post: { type: mongoose.Schema.Types.ObjectId, ref: "NightRoomPost", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    is_anonymous: { type: Boolean, default: false }
  },
  { timestamps: true }
);

NightRoomReplySchema.index({ post: 1, createdAt: 1 });

const NightRoomReply = mongoose.model("NightRoomReply", NightRoomReplySchema);

module.exports = { NightRoomReply };


