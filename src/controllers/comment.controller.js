const mongoose = require("mongoose");
const { Comment } = require("../models/comment.model.js");
const { Question } = require("../models/question.model.js");
const { notifyOnComment } = require("../services/notification.service.js");
const { toCommentDTO } = require("../utils/serializers.js");

function toObjectId(value) {
  return mongoose.isValidObjectId(value) ? new mongoose.Types.ObjectId(value) : null;
}

async function listCommentsForQuestion(req, res, next) {
  try {
    const questionId = toObjectId(req.params.questionId);
    if (!questionId) {
      return res.json({ comments: [] });
    }

    const comments = await Comment.find({ question: questionId })
      .populate("user", "name email avatar")
      .sort({ createdAt: 1 })
      .lean();

    res.json({ comments: comments.map(toCommentDTO) });
  } catch (err) {
    next(err);
  }
}

async function createComment(req, res, next) {
  try {
    const { title, question_id } = req.body || {};
    const isAnonymous = req.body?.is_anonymous === 1 || req.body?.is_anonymous === true;

    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ message: "title is required" });
    }

    const questionId = toObjectId(question_id);
    if (!questionId) {
      return res.status(400).json({ message: "valid question_id is required" });
    }

    const question = await Question.findById(questionId).lean();
    if (!question) {
      return res.status(404).json({ message: "question not found" });
    }

    const participantUserIds = await Comment.find({ question: questionId })
      .distinct("user");

    const comment = await Comment.create({
      title: title.trim(),
      question: questionId,
      user: req.user._id,
      is_anonymous: isAnonymous
    });

    await notifyOnComment({
      question,
      actor: req.user,
      commentId: comment._id,
      commentTitle: comment.title,
      participantUserIds
    });

    const hydrated = await Comment.findById(comment._id).populate("user", "name email avatar").lean();
    res.status(201).json({ comment: toCommentDTO(hydrated) });
  } catch (err) {
    next(err);
  }
}

module.exports = { listCommentsForQuestion, createComment };


