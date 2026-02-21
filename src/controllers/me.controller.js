export async function getMe(req, res, next) {
  try {
    res.json({
      user: {
        id: req.user._id.toString(),
        name: req.user.name,
        email: req.user.email,
        avatar: req.user.avatar || ""
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function updateMyAvatar(req, res, next) {
  try {
    const { avatar } = req.body || {};
    if (!avatar || typeof avatar !== "string" || !avatar.trim()) {
      return res.status(400).json({ message: "avatar is required" });
    }

    const normalizedAvatar = avatar.trim();
    if (normalizedAvatar.length > 64) {
      return res.status(400).json({ message: "avatar is too long" });
    }

    req.user.avatar = normalizedAvatar;
    await req.user.save();

    res.json({
      user: {
        id: req.user._id.toString(),
        name: req.user.name,
        email: req.user.email,
        avatar: req.user.avatar || ""
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function updateMe(req, res, next) {
  try {
    const { name } = req.body || {};
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ message: "name is required" });
    }

    const normalizedName = name.trim();
    if (normalizedName.length < 2 || normalizedName.length > 80) {
      return res.status(400).json({ message: "name must be 2-80 characters" });
    }

    req.user.name = normalizedName;
    await req.user.save();

    res.json({
      user: {
        id: req.user._id.toString(),
        name: req.user.name,
        email: req.user.email,
        avatar: req.user.avatar || ""
      }
    });
  } catch (err) {
    next(err);
  }
}
