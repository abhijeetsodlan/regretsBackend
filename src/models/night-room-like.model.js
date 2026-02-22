import mongoose from "mongoose";

const NightRoomLikeSchema = new mongoose.Schema(
  {
    post: { type: mongoose.Schema.Types.ObjectId, ref: "NightRoomPost", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

NightRoomLikeSchema.index({ post: 1, user: 1 }, { unique: true });

export const NightRoomLike = mongoose.model("NightRoomLike", NightRoomLikeSchema);
