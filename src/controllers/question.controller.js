import mongoose from "mongoose";
import { Category } from "../models/category.model.js";
import { Comment } from "../models/comment.model.js";
import { Like } from "../models/like.model.js";
import { Question } from "../models/question.model.js";
import { SavedPost } from "../models/saved-post.model.js";
import { emitQuestionCreated } from "../realtime/realtime.js";
import { notifyRegretLiked } from "../services/notification.service.js";
import { slugifyCategoryName } from "../services/category.service.js";
import { resolveCurrentUser } from "../utils/request-user.js";
import { toQuestionDTO } from "../utils/serializers.js";

function toObjectId(value) {
  return mongoose.isValidObjectId(value) ? new mongoose.Types.ObjectId(value) : null;
}

function toInt(value) {
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
}

async function resolveCategoryFromInput(rawCategoryId, rawCategoryName) {
  const objectId = toObjectId(rawCategoryId);
  if (objectId) {
    const byObjectId = await Category.findById(objectId);
    if (byObjectId) {
      return byObjectId;
    }
  }

  const numericCategoryId = toInt(rawCategoryId);
  if (numericCategoryId === null) {
    return null;
  }

  const byNumericId = await Category.findOne({ category_id: numericCategoryId });
  if (byNumericId) {
    return byNumericId;
  }

  const categoryName = typeof rawCategoryName === "string" && rawCategoryName.trim()
    ? rawCategoryName.trim()
    : `Category ${numericCategoryId}`;
  const slugBase = slugifyCategoryName(categoryName) || `category-${numericCategoryId}`;

  return Category.create({
    category_id: numericCategoryId,
    name: categoryName,
    slug: slugBase
  });
}

async function mapQuestionsWithLikes(questions, currentUser) {
  const questionIds = questions.map((question) => question._id);
  if (questionIds.length === 0) {
    return [];
  }

  const likeCounts = await Like.aggregate([
    { $match: { question: { $in: questionIds } } },
    { $group: { _id: "$question", count: { $sum: 1 } } }
  ]);
  const countMap = new Map(likeCounts.map((entry) => [entry._id.toString(), entry.count]));
  const replyCounts = await Comment.aggregate([
    { $match: { question: { $in: questionIds } } },
    { $group: { _id: "$question", count: { $sum: 1 } } }
  ]);
  const replyCountMap = new Map(replyCounts.map((entry) => [entry._id.toString(), entry.count]));

  let likedQuestionIdSet = new Set();
  let savedQuestionIdSet = new Set();
  if (currentUser) {
    const likedRows = await Like.find({
      user: currentUser._id,
      question: { $in: questionIds }
    })
      .select("question")
      .lean();
    likedQuestionIdSet = new Set(likedRows.map((row) => row.question.toString()));

    const savedRows = await SavedPost.find({
      user: currentUser._id,
      question: { $in: questionIds }
    })
      .select("question")
      .lean();
    savedQuestionIdSet = new Set(savedRows.map((row) => row.question.toString()));
  }

  return questions.map((question) =>
    toQuestionDTO(question, {
      likesCount: countMap.get(question._id.toString()) || 0,
      likedByUser: likedQuestionIdSet.has(question._id.toString()),
      isSaved: savedQuestionIdSet.has(question._id.toString()),
      repliesCount: replyCountMap.get(question._id.toString()) || 0
    })
  );
}

export async function listQuestions(req, res, next) {
  try {
    const currentUser = await resolveCurrentUser(req);
    const questions = await Question.find()
      .populate("user", "name email avatar")
      .sort({ createdAt: -1 })
      .lean();

    const payload = await mapQuestionsWithLikes(questions, currentUser);
    res.json({ questions: payload });
  } catch (err) {
    next(err);
  }
}

export async function listQuestionsByCategory(req, res, next) {
  try {
    const rawCategoryId = req.params.categoryId;
    let category = null;

    const objectId = toObjectId(rawCategoryId);
    if (objectId) {
      category = await Category.findById(objectId).lean();
    } else {
      const numericCategoryId = toInt(rawCategoryId);
      if (numericCategoryId !== null) {
        category = await Category.findOne({ category_id: numericCategoryId }).lean();
      }
    }

    if (!category) {
      return res.json({ questions: [] });
    }

    const currentUser = await resolveCurrentUser(req);
    const questions = await Question.find({ category: category._id })
      .populate("user", "name email avatar")
      .sort({ createdAt: -1 })
      .lean();

    const payload = await mapQuestionsWithLikes(questions, currentUser);
    res.json({ questions: payload });
  } catch (err) {
    next(err);
  }
}

export async function getQuestion(req, res, next) {
  try {
    const id = toObjectId(req.params.id);
    if (!id) {
      return res.status(400).json({ message: "invalid id" });
    }

    const currentUser = await resolveCurrentUser(req);
    const question = await Question.findById(id).populate("user", "name email avatar").lean();
    if (!question) {
      return res.status(404).json({ message: "not found" });
    }

    const likesCount = await Like.countDocuments({ question: id });
    const repliesCount = await Comment.countDocuments({ question: id });
    const likedByUser = currentUser
      ? Boolean(await Like.findOne({ question: id, user: currentUser._id }).lean())
      : false;
    const isSaved = currentUser
      ? Boolean(await SavedPost.findOne({ question: id, user: currentUser._id }).lean())
      : false;

    res.json({
      question: toQuestionDTO(question, { likesCount, likedByUser, isSaved, repliesCount })
    });
  } catch (err) {
    next(err);
  }
}

export async function createQuestion(req, res, next) {
  try {
    const { title, category_id, category_name } = req.body || {};
    const isAnonymous = req.body?.is_anonymous === 1 || req.body?.is_anonymous === true;

    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ message: "title is required" });
    }

    if (category_id === undefined || category_id === null || category_id === "") {
      return res.status(400).json({ message: "valid category_id is required" });
    }

    const category = await resolveCategoryFromInput(category_id, category_name);
    if (!category) {
      return res.status(404).json({ message: "category not found" });
    }

    const question = await Question.create({
      title: title.trim(),
      category: category._id,
      user: req.user._id,
      is_anonymous: isAnonymous
    });

    const hydrated = await Question.findById(question._id).populate("user", "name email avatar").lean();
    const createdQuestion = toQuestionDTO(hydrated, {
      likesCount: 0,
      likedByUser: false,
      isSaved: false,
      repliesCount: 0
    });
    emitQuestionCreated(createdQuestion);

    res.status(201).json({
      question: createdQuestion
    });
  } catch (err) {
    next(err);
  }
}

export async function updateQuestion(req, res, next) {
  try {
    const questionId = toObjectId(req.params.id);
    if (!questionId) {
      return res.status(400).json({ message: "invalid id" });
    }

    const { title } = req.body || {};
    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ message: "title is required" });
    }

    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({ message: "not found" });
    }

    if (String(question.user) !== String(req.user._id)) {
      return res.status(403).json({ message: "forbidden" });
    }

    question.title = title.trim();
    await question.save();

    const hydrated = await Question.findById(question._id).populate("user", "name email avatar").lean();
    const likesCount = await Like.countDocuments({ question: question._id });
    const repliesCount = await Comment.countDocuments({ question: question._id });

    res.json({
      question: toQuestionDTO(hydrated, {
        likesCount,
        likedByUser: false,
        isSaved: false,
        repliesCount
      })
    });
  } catch (err) {
    next(err);
  }
}

export async function toggleLikeQuestion(req, res, next) {
  try {
    const questionId = toObjectId(req.params.id);
    if (!questionId) {
      return res.status(400).json({ message: "invalid id" });
    }

    const question = await Question.findById(questionId).lean();
    if (!question) {
      return res.status(404).json({ message: "not found" });
    }

    const existing = await Like.findOne({ question: questionId, user: req.user._id }).lean();
    if (existing) {
      await Like.deleteOne({ _id: existing._id });
    } else {
      await Like.create({ question: questionId, user: req.user._id });
      await notifyRegretLiked({ question, actor: req.user });
    }

    const likesCount = await Like.countDocuments({ question: questionId });
    res.json({
      liked: !existing,
      likes_count: likesCount
    });
  } catch (err) {
    next(err);
  }
}
