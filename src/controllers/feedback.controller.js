const { Feedback } = require("../models/feedback.model.js");

async function createFeedback(req, res, next) {
  try {
    const { type, message, contact_email } = req.body || {};

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ message: "message is required" });
    }

    const normalizedType = ["review", "suggestion", "general"].includes(type)
      ? type
      : "general";

    const feedback = await Feedback.create({
      type: normalizedType,
      message: message.trim(),
      contact_email: typeof contact_email === "string" ? contact_email.trim().toLowerCase() : "",
      user: req.user ? req.user._id : null
    });

    res.status(201).json({
      feedback: {
        id: feedback._id.toString(),
        type: feedback.type,
        message: feedback.message,
        created_at: feedback.createdAt
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { createFeedback };


