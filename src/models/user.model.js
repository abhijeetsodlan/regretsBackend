import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    googleId: { type: String, default: null },
    avatar: { type: String, default: "" },
    last_login_at: { type: Date, default: null }
  },
  { timestamps: true }
);

export const User = mongoose.model("User", UserSchema);
