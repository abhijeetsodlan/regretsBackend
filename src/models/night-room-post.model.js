import mongoose from "mongoose";

const NightRoomPostSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    is_anonymous: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const NightRoomPost = mongoose.model("NightRoomPost", NightRoomPostSchema);
