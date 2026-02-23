const mongoose = require("mongoose");
const { Comment } = require("../models/comment.model.js");
const { Feedback } = require("../models/feedback.model.js");
const { Like } = require("../models/like.model.js");
const { Notification } = require("../models/notification.model.js");
const { Question } = require("../models/question.model.js");
const { SavedPost } = require("../models/saved-post.model.js");
const { User } = require("../models/user.model.js");
const { emitNotificationToUser } = require("../realtime/realtime.js");

const ADMIN_EMAIL = "abhijeetsodlan7@gmail.com";

function isAdmin(user) {
  return Boolean(user?.email && String(user.email).toLowerCase() === ADMIN_EMAIL);
}

function toObjectId(value) {
  return mongoose.isValidObjectId(value) ? new mongoose.Types.ObjectId(value) : null;
}

function getPagination(query) {
  const pageRaw = Number.parseInt(query?.page, 10);
  const limitRaw = Number.parseInt(query?.limit, 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 10;
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function requireAdmin(req, res, next) {
  if (!isAdmin(req.user)) {
    return res.status(403).json({ message: "Forbidden" });
  }
  return next();
}

async function listAdminUsers(req, res, next) {
  try {
    const search = (req.query?.search || "").trim();
    const { page, limit, skip } = getPagination(req.query);
    const query = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } }
          ]
        }
      : {};

    const [users, filteredTotal] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(query)
    ]);
    const userIds = users.map((u) => u._id);

    const questionCounts = await Question.aggregate([
      { $match: { user: { $in: userIds } } },
      { $group: { _id: "$user", count: { $sum: 1 } } }
    ]);
    const commentCounts = await Comment.aggregate([
      { $match: { user: { $in: userIds } } },
      { $group: { _id: "$user", count: { $sum: 1 } } }
    ]);
    const questionMap = new Map(questionCounts.map((row) => [row._id.toString(), row.count]));
    const commentMap = new Map(commentCounts.map((row) => [row._id.toString(), row.count]));
    const totalUsers = await User.countDocuments();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const joinedToday = await User.countDocuments({ createdAt: { $gte: todayStart } });

    res.json({
      stats: {
        total_users: totalUsers,
        joined_today: joinedToday
      },
      pagination: {
        page,
        limit,
        total: filteredTotal,
        total_pages: Math.max(1, Math.ceil(filteredTotal / limit))
      },
      users: users.map((u) => ({
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        avatar: u.avatar || "",
        created_at: u.createdAt,
        last_login_at: u.last_login_at || null,
        regrets_count: questionMap.get(u._id.toString()) || 0,
        replies_count: commentMap.get(u._id.toString()) || 0
      }))
    });
  } catch (err) {
    next(err);
  }
}

async function getAdminUserPosts(req, res, next) {
  try {
    const userId = toObjectId(req.params.id);
    if (!userId) {
      return res.status(400).json({ message: "invalid id" });
    }

    const user = await User.findById(userId).select("name email").lean();
    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }

    const questions = await Question.find({ user: userId })
      .sort({ createdAt: -1 })
      .select("title is_anonymous createdAt")
      .lean();

    res.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email
      },
      posts: questions.map((q) => ({
        id: q._id.toString(),
        title: q.title,
        is_anonymous: Boolean(q.is_anonymous),
        created_at: q.createdAt
      }))
    });
  } catch (err) {
    next(err);
  }
}

async function getAdminQuestionReplies(req, res, next) {
  try {
    const questionId = toObjectId(req.params.id);
    if (!questionId) {
      return res.status(400).json({ message: "invalid id" });
    }

    const question = await Question.findById(questionId).populate("user", "name email").lean();
    if (!question) {
      return res.status(404).json({ message: "not found" });
    }

    const replies = await Comment.find({ question: questionId })
      .populate("user", "name email avatar")
      .sort({ createdAt: 1 })
      .lean();

    res.json({
      question: {
        id: question._id.toString(),
        title: question.title,
        is_anonymous: Boolean(question.is_anonymous),
        user: question.user
          ? {
              id: question.user._id.toString(),
              name: question.user.name,
              email: question.user.email
            }
          : null,
        created_at: question.createdAt
      },
      replies: replies.map((r) => ({
        id: r._id.toString(),
        title: r.title,
        is_anonymous: Boolean(r.is_anonymous),
        user: r.user
          ? {
              id: r.user._id.toString(),
              name: r.user.name,
              email: r.user.email,
              avatar: r.user.avatar || ""
            }
          : null,
        created_at: r.createdAt
      }))
    });
  } catch (err) {
    next(err);
  }
}

async function listAdminQuestions(req, res, next) {
  try {
    const search = (req.query?.search || "").trim();
    const { page, limit, skip } = getPagination(req.query);
    const query = search
      ? { title: { $regex: search, $options: "i" } }
      : {};

    const [questions, filteredTotal] = await Promise.all([
      Question.find(query)
        .populate("user", "name email avatar")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Question.countDocuments(query)
    ]);

    res.json({
      pagination: {
        page,
        limit,
        total: filteredTotal,
        total_pages: Math.max(1, Math.ceil(filteredTotal / limit))
      },
      questions: questions.map((q) => ({
        id: q._id.toString(),
        title: q.title,
        is_anonymous: Boolean(q.is_anonymous),
        user: q.user
          ? {
              id: q.user._id.toString(),
              name: q.user.name,
              email: q.user.email,
              avatar: q.user.avatar || ""
            }
          : null,
        created_at: q.createdAt
      }))
    });
  } catch (err) {
    next(err);
  }
}

async function listAdminComments(req, res, next) {
  try {
    const search = (req.query?.search || "").trim();
    const { page, limit, skip } = getPagination(req.query);
    const query = search
      ? { title: { $regex: search, $options: "i" } }
      : {};

    const [comments, filteredTotal] = await Promise.all([
      Comment.find(query)
        .populate("user", "name email avatar")
        .populate("question", "title")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Comment.countDocuments(query)
    ]);

    res.json({
      pagination: {
        page,
        limit,
        total: filteredTotal,
        total_pages: Math.max(1, Math.ceil(filteredTotal / limit))
      },
      comments: comments.map((c) => ({
        id: c._id.toString(),
        title: c.title,
        is_anonymous: Boolean(c.is_anonymous),
        user: c.user
          ? {
              id: c.user._id.toString(),
              name: c.user.name,
              email: c.user.email,
              avatar: c.user.avatar || ""
            }
          : null,
        question: c.question
          ? {
              id: c.question._id.toString(),
              title: c.question.title
            }
          : null,
        created_at: c.createdAt
      }))
    });
  } catch (err) {
    next(err);
  }
}

async function deleteAdminQuestion(req, res, next) {
  try {
    const questionId = toObjectId(req.params.id);
    if (!questionId) {
      return res.status(400).json({ message: "invalid id" });
    }

    await Question.deleteOne({ _id: questionId });
    await Comment.deleteMany({ question: questionId });
    await Notification.deleteMany({ question: questionId });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

async function deleteAdminComment(req, res, next) {
  try {
    const commentId = toObjectId(req.params.id);
    if (!commentId) {
      return res.status(400).json({ message: "invalid id" });
    }

    await Comment.deleteOne({ _id: commentId });
    await Notification.deleteMany({ comment: commentId });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

async function deleteAdminUser(req, res, next) {
  try {
    const userId = toObjectId(req.params.id);
    if (!userId) {
      return res.status(400).json({ message: "invalid id" });
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }
    if (String(user.email).toLowerCase() === ADMIN_EMAIL) {
      return res.status(403).json({ message: "cannot delete admin user" });
    }

    const userQuestions = await Question.find({ user: userId }).select("_id").lean();
    const questionIds = userQuestions.map((q) => q._id);

    await Comment.deleteMany({ $or: [{ user: userId }, { question: { $in: questionIds } }] });
    await Like.deleteMany({ $or: [{ user: userId }, { question: { $in: questionIds } }] });
    await SavedPost.deleteMany({ $or: [{ user: userId }, { question: { $in: questionIds } }] });
    await Notification.deleteMany({
      $or: [{ user: userId }, { actor: userId }, { question: { $in: questionIds } }]
    });
    await Question.deleteMany({ user: userId });
    await User.deleteOne({ _id: userId });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

async function sendAdminNotification(req, res, next) {
  try {
    const {
      message,
      user_id: userIdRaw,
      user_ids: userIdsRaw,
      user_email: userEmailRaw,
      send_to_all: sendToAllRaw
    } = req.body || {};
    const sendToAll = Boolean(sendToAllRaw);

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ message: "message is required" });
    }
    const text = message.trim();

    let recipients = [];
    if (sendToAll) {
      recipients = await User.find().select("_id").lean();
    } else if (Array.isArray(userIdsRaw) && userIdsRaw.length > 0) {
      const objectIds = userIdsRaw
        .map((id) => toObjectId(id))
        .filter(Boolean);
      if (objectIds.length === 0) {
        return res.status(400).json({ message: "invalid user_ids" });
      }
      recipients = await User.find({ _id: { $in: objectIds } }).select("_id").lean();
    } else if (userIdRaw) {
      const userId = toObjectId(userIdRaw);
      if (!userId) {
        return res.status(400).json({ message: "invalid user_id" });
      }
      const user = await User.findById(userId).select("_id").lean();
      if (!user) {
        return res.status(404).json({ message: "user not found" });
      }
      recipients = [user];
    } else if (userEmailRaw) {
      const email = String(userEmailRaw).trim().toLowerCase();
      const user = await User.findOne({ email }).select("_id").lean();
      if (!user) {
        return res.status(404).json({ message: "user not found" });
      }
      recipients = [user];
    } else {
      return res.status(400).json({ message: "select a recipient or send_to_all" });
    }

    if (recipients.length === 0) {
      return res.status(400).json({ message: "no recipients found" });
    }

    const rows = await Notification.insertMany(
      recipients.map((u) => ({
        user: u._id,
        actor: req.user._id,
        question: null,
        comment: null,
        type: "admin_message",
        message: text,
        is_read: false
      }))
    );

    rows.forEach((row) => {
      emitNotificationToUser(row.user, {
        id: row._id.toString(),
        type: row.type,
        message: row.message,
        is_read: false,
        question_id: null,
        created_at: row.createdAt
      });
    });

    res.status(201).json({ success: true, sent_count: rows.length });
  } catch (err) {
    next(err);
  }
}

async function listAdminFeedbacks(req, res, next) {
  try {
    const search = (req.query?.search || "").trim();
    const { page, limit, skip } = getPagination(req.query);
    const query = search
      ? {
          $or: [
            { message: { $regex: search, $options: "i" } },
            { contact_email: { $regex: search, $options: "i" } }
          ]
        }
      : {};

    const [feedbacks, filteredTotal] = await Promise.all([
      Feedback.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Feedback.countDocuments(query)
    ]);

    res.json({
      pagination: {
        page,
        limit,
        total: filteredTotal,
        total_pages: Math.max(1, Math.ceil(filteredTotal / limit))
      },
      feedbacks: feedbacks.map((f) => ({
        id: f._id.toString(),
        message: f.message,
        contact_email: f.contact_email || "",
        type: f.type || "general",
        created_at: f.createdAt
      }))
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { listAdminUsers, getAdminUserPosts, getAdminQuestionReplies, listAdminQuestions, listAdminComments, deleteAdminQuestion, deleteAdminComment, deleteAdminUser, sendAdminNotification, listAdminFeedbacks, requireAdmin };


