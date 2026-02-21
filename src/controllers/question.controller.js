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

async function buildQuestionMetrics(questionIds, currentUser) {
  if (questionIds.length === 0) {
    return {
      likeCountMap: new Map(),
      replyCountMap: new Map(),
      saveCountMap: new Map(),
      likedQuestionIdSet: new Set(),
      savedQuestionIdSet: new Set()
    };
  }

  const likeCounts = await Like.aggregate([
    { $match: { question: { $in: questionIds } } },
    { $group: { _id: "$question", count: { $sum: 1 } } }
  ]);
  const likeCountMap = new Map(likeCounts.map((entry) => [entry._id.toString(), entry.count]));
  const replyCounts = await Comment.aggregate([
    { $match: { question: { $in: questionIds } } },
    { $group: { _id: "$question", count: { $sum: 1 } } }
  ]);
  const replyCountMap = new Map(replyCounts.map((entry) => [entry._id.toString(), entry.count]));
  const saveCounts = await SavedPost.aggregate([
    { $match: { question: { $in: questionIds } } },
    { $group: { _id: "$question", count: { $sum: 1 } } }
  ]);
  const saveCountMap = new Map(saveCounts.map((entry) => [entry._id.toString(), entry.count]));

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

  return {
    likeCountMap,
    replyCountMap,
    saveCountMap,
    likedQuestionIdSet,
    savedQuestionIdSet
  };
}

async function mapQuestionsWithMetrics(questions, currentUser) {
  if (questions.length === 0) {
    return [];
  }

  const questionIds = questions.map((question) => question._id);
  const {
    likeCountMap,
    replyCountMap,
    likedQuestionIdSet,
    savedQuestionIdSet
  } = await buildQuestionMetrics(questionIds, currentUser);

  return questions.map((question) =>
    toQuestionDTO(question, {
      likesCount: likeCountMap.get(question._id.toString()) || 0,
      likedByUser: likedQuestionIdSet.has(question._id.toString()),
      isSaved: savedQuestionIdSet.has(question._id.toString()),
      repliesCount: replyCountMap.get(question._id.toString()) || 0,
      sharesCount: Number(question.shares_count || 0)
    })
  );
}

async function getTopRegretOfTheDay(currentUser) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const todaysQuestions = await Question.find({ createdAt: { $gte: startOfDay } })
    .populate("user", "name email avatar")
    .lean();

  if (todaysQuestions.length === 0) {
    return null;
  }

  const questionIds = todaysQuestions.map((question) => question._id);
  const {
    likeCountMap,
    replyCountMap,
    saveCountMap,
    likedQuestionIdSet,
    savedQuestionIdSet
  } = await buildQuestionMetrics(questionIds, currentUser);

  let winner = null;
  let winnerScore = -1;
  let winnerLikes = -1;
  let winnerReplies = -1;
  let winnerSaves = -1;
  let winnerShares = -1;

  todaysQuestions.forEach((question) => {
    const key = question._id.toString();
    const likes = likeCountMap.get(key) || 0;
    const replies = replyCountMap.get(key) || 0;
    const saves = saveCountMap.get(key) || 0;
    const shares = Number(question.shares_count || 0);
    const score = (likes + replies + saves + shares) / 4;

    const shouldReplace =
      score > winnerScore ||
      (score === winnerScore && likes > winnerLikes) ||
      (score === winnerScore && likes === winnerLikes && replies > winnerReplies) ||
      (score === winnerScore && likes === winnerLikes && replies === winnerReplies && saves > winnerSaves) ||
      (score === winnerScore &&
        likes === winnerLikes &&
        replies === winnerReplies &&
        saves === winnerSaves &&
        shares > winnerShares) ||
      (score === winnerScore &&
        likes === winnerLikes &&
        replies === winnerReplies &&
        saves === winnerSaves &&
        shares === winnerShares &&
        new Date(question.createdAt).getTime() > new Date(winner?.createdAt || 0).getTime());

    if (shouldReplace) {
      winner = question;
      winnerScore = score;
      winnerLikes = likes;
      winnerReplies = replies;
      winnerSaves = saves;
      winnerShares = shares;
    }
  });

  if (!winner) {
    return null;
  }

  const winnerId = winner._id.toString();
  return {
    question: toQuestionDTO(winner, {
      likesCount: likeCountMap.get(winnerId) || 0,
      likedByUser: likedQuestionIdSet.has(winnerId),
      isSaved: savedQuestionIdSet.has(winnerId),
      repliesCount: replyCountMap.get(winnerId) || 0,
      sharesCount: Number(winner.shares_count || 0)
    }),
    metrics: {
      likes: likeCountMap.get(winnerId) || 0,
      replies: replyCountMap.get(winnerId) || 0,
      saved: saveCountMap.get(winnerId) || 0,
      shares: Number(winner.shares_count || 0),
      average_score: Number(winnerScore.toFixed(2))
    }
  };
}

export async function listQuestions(req, res, next) {
  try {
    const currentUser = await resolveCurrentUser(req);
    const questions = await Question.find()
      .populate("user", "name email avatar")
      .sort({ createdAt: -1 })
      .lean();

    const [payload, topRegretOfTheDay] = await Promise.all([
      mapQuestionsWithMetrics(questions, currentUser),
      getTopRegretOfTheDay(currentUser)
    ]);
    res.json({ questions: payload, top_regret_of_day: topRegretOfTheDay });
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

    const payload = await mapQuestionsWithMetrics(questions, currentUser);
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
      question: toQuestionDTO(question, {
        likesCount,
        likedByUser,
        isSaved,
        repliesCount,
        sharesCount: Number(question.shares_count || 0)
      })
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
        repliesCount,
        sharesCount: Number(hydrated?.shares_count || 0)
      })
    });
  } catch (err) {
    next(err);
  }
}

export async function trackQuestionShare(req, res, next) {
  try {
    const questionId = toObjectId(req.params.id);
    if (!questionId) {
      return res.status(400).json({ message: "invalid id" });
    }

    const updated = await Question.findByIdAndUpdate(
      questionId,
      { $inc: { shares_count: 1 } },
      { new: true }
    )
      .select("_id shares_count")
      .lean();

    if (!updated) {
      return res.status(404).json({ message: "not found" });
    }

    res.json({
      id: updated._id.toString(),
      shares_count: Number(updated.shares_count || 0)
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
