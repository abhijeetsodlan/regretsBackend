import mongoose from "mongoose";
import { Question } from "../models/question.model.js";
import { SavedPost } from "../models/saved-post.model.js";

function toObjectId(value) {
  return mongoose.isValidObjectId(value) ? new mongoose.Types.ObjectId(value) : null;
}

export function csrfCookie(req, res) {
  res.status(204).send();
}

export function logout(req, res) {
  res.json({ message: "Logged out" });
}

export async function savePost(req, res, next) {
  try {
    const questionId = toObjectId(req.body?.question_id);
    if (!questionId) {
      return res.status(400).json({ message: "valid question_id is required" });
    }

    const question = await Question.findById(questionId).lean();
    if (!question) {
      return res.status(404).json({ message: "question not found" });
    }

    const existing = await SavedPost.findOne({
      question: questionId,
      user: req.user._id
    }).lean();

    if (existing) {
      await SavedPost.deleteOne({ _id: existing._id });
      return res.json({ saved: false });
    }

    await SavedPost.create({ question: questionId, user: req.user._id });
    return res.status(201).json({ saved: true });
  } catch (err) {
    next(err);
  }
}

