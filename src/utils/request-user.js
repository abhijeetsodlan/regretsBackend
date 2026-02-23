const { User } = require("../models/user.model.js");

async function resolveCurrentUser(req) {
  if (req.user) {
    return req.user;
  }

  const rawEmail = req.query?.email || req.body?.email;
  if (!rawEmail || typeof rawEmail !== "string") {
    return null;
  }

  const email = rawEmail.trim().toLowerCase();
  if (!email) {
    return null;
  }

  return User.findOne({ email });
}

module.exports = { resolveCurrentUser };


