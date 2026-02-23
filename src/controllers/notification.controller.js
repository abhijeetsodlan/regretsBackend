const mongoose = require("mongoose");
const { Notification } = require("../models/notification.model.js");

function truncate(text, maxLength) {
  if (!text || typeof text !== "string") {
    return "";
  }
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxLength - 3)}...`;
}

function buildAnonymousMessage(notificationDoc) {
  const questionTitle = notificationDoc.question?.title
    ? truncate(notificationDoc.question.title, 60)
    : "";
  const commentTitle = notificationDoc.comment?.title
    ? truncate(notificationDoc.comment.title, 90)
    : "";

  if (notificationDoc.type === "regret_liked") {
    return questionTitle
      ? `Someone liked your regret: "${questionTitle}"`
      : "Someone liked your regret.";
  }

  if (notificationDoc.type === "regret_replied") {
    return commentTitle
      ? `Someone replied to your regret: "${commentTitle}"`
      : "Someone replied to your regret.";
  }

  if (notificationDoc.type === "participant_replied") {
    return commentTitle
      ? `Someone also replied on a regret you participated in: "${commentTitle}"`
      : "Someone also replied on a regret you participated in.";
  }

  return notificationDoc.message || "You have a new notification.";
}

function toNotificationDTO(notificationDoc) {
  const resolvedQuestionId =
    notificationDoc.question?._id
      ? notificationDoc.question._id.toString()
      : notificationDoc.question && typeof notificationDoc.question === "object" && notificationDoc.question.toString
        ? notificationDoc.question.toString()
        : null;

  return {
    id: notificationDoc._id.toString(),
    type: notificationDoc.type,
    message: buildAnonymousMessage(notificationDoc),
    is_read: Boolean(notificationDoc.is_read),
    question_id: resolvedQuestionId,
    actor: notificationDoc.actor?._id
      ? {
          id: notificationDoc.actor._id.toString(),
          name: notificationDoc.actor.name,
          email: notificationDoc.actor.email
        }
      : null,
    created_at: notificationDoc.createdAt
  };
}

function toObjectId(value) {
  return mongoose.isValidObjectId(value) ? new mongoose.Types.ObjectId(value) : null;
}

async function listNotifications(req, res, next) {
  try {
    const rows = await Notification.find({ user: req.user._id })
      .populate("actor", "name email")
      .populate("question", "_id title")
      .populate("comment", "title")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const unreadCount = await Notification.countDocuments({
      user: req.user._id,
      is_read: false
    });

    res.json({
      notifications: rows.map(toNotificationDTO),
      unread_count: unreadCount
    });
  } catch (err) {
    next(err);
  }
}

async function markNotificationRead(req, res, next) {
  try {
    const notificationId = toObjectId(req.params.id);
    if (!notificationId) {
      return res.status(400).json({ message: "invalid id" });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, user: req.user._id },
      { $set: { is_read: true } },
      { new: true }
    )
      .populate("actor", "name email")
      .populate("question", "_id title")
      .populate("comment", "title")
      .lean();

    if (!notification) {
      return res.status(404).json({ message: "not found" });
    }

    res.json({ notification: toNotificationDTO(notification) });
  } catch (err) {
    next(err);
  }
}

async function markAllNotificationsRead(req, res, next) {
  try {
    await Notification.updateMany(
      { user: req.user._id, is_read: false },
      { $set: { is_read: true } }
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

async function clearNotifications(req, res, next) {
  try {
    const result = await Notification.deleteMany({ user: req.user._id });
    res.json({ success: true, deleted_count: result.deletedCount || 0 });
  } catch (err) {
    next(err);
  }
}

module.exports = { listNotifications, markNotificationRead, markAllNotificationsRead, clearNotifications };


