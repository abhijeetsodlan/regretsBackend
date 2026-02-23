const { Notification } = require("../models/notification.model.js");
const { emitNotificationToUser } = require("../realtime/realtime.js");

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

function quotedSnippet(text, maxLength = 80) {
  const value = truncate(text, maxLength);
  return value ? `"${value}"` : "";
}

async function createNotification({
  userId,
  actorId,
  questionId,
  type,
  message,
  commentId = null
}) {
  if (!userId || !actorId || !questionId || !type || !message) {
    return;
  }
  if (String(userId) === String(actorId)) {
    return;
  }

  const notification = await Notification.create({
    user: userId,
    actor: actorId,
    question: questionId,
    comment: commentId,
    type,
    message,
    is_read: false
  });

  emitNotificationToUser(userId, {
    id: notification._id.toString(),
    type: notification.type,
    message: notification.message,
    is_read: false,
    question_id: String(questionId),
    created_at: notification.createdAt
  });

  return notification;
}

async function notifyRegretLiked({ question, actor }) {
  if (!question?.user || !actor?._id) {
    return;
  }
  const titlePreview = truncate(question.title, 60);
  await createNotification({
    userId: question.user,
    actorId: actor._id,
    questionId: question._id,
    type: "regret_liked",
    message: `Someone liked your regret: "${titlePreview}"`
  });
}

async function notifyOnComment({
  question,
  actor,
  commentId,
  commentTitle = "",
  participantUserIds = []
}) {
  if (!question?._id || !question?.user || !actor?._id) {
    return;
  }
  const replyPreview = quotedSnippet(commentTitle, 90);
  const ownerId = String(question.user);
  const actorId = String(actor._id);

  if (ownerId !== actorId) {
    await createNotification({
      userId: question.user,
      actorId: actor._id,
      questionId: question._id,
      commentId,
      type: "regret_replied",
      message: replyPreview
        ? `Someone replied to your regret: ${replyPreview}`
        : "Someone replied to your regret."
    });
  }

  const uniqueParticipantIds = [...new Set(participantUserIds.map((id) => String(id)))];
  const filteredParticipantIds = uniqueParticipantIds.filter(
    (id) => id !== actorId && id !== ownerId
  );

  if (filteredParticipantIds.length === 0) {
    return;
  }

  const rows = await Notification.insertMany(
    filteredParticipantIds.map((userId) => ({
      user: userId,
      actor: actor._id,
      question: question._id,
      comment: commentId,
      type: "participant_replied",
      message: replyPreview
        ? `Someone also replied on a regret you participated in: ${replyPreview}`
        : "Someone also replied on a regret you participated in.",
      is_read: false
    }))
  );

  rows.forEach((row) => {
    emitNotificationToUser(row.user, {
      id: row._id.toString(),
      type: row.type,
      message: row.message,
      is_read: false,
      question_id: row.question.toString(),
      created_at: row.createdAt
    });
  });
}

module.exports = { notifyRegretLiked, notifyOnComment };


