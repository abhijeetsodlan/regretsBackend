const mongoose = require("mongoose");

const NightRoomSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "global" },
    mode: {
      type: String,
      enum: ["auto", "force_on", "force_off"],
      default: "auto"
    },
    forced_on_since: { type: Date, default: null }
  },
  { timestamps: true }
);

const NightRoomSetting = mongoose.model("NightRoomSetting", NightRoomSettingSchema);

module.exports = { NightRoomSetting };


