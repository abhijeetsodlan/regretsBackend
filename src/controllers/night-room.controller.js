import mongoose from "mongoose";
import { NightRoomLike } from "../models/night-room-like.model.js";
import { NightRoomPost } from "../models/night-room-post.model.js";
import { NightRoomReply } from "../models/night-room-reply.model.js";
import { NightRoomSetting } from "../models/night-room-setting.model.js";
import {
  getNightRoomActiveUsersCount,
  leaveNightRoomSession,
  touchNightRoomSession
} from "../services/night-room-presence.service.js";
import { toNightRoomPostDTO, toNightRoomReplyDTO } from "../utils/serializers.js";
import { getNightRoomWindow, isNightRoomOpen } from "../utils/night-room.js";

function toObjectId(value) {
  return mongoose.isValidObjectId(value) ? new mongoose.Types.ObjectId(value) : null;
}

async function getNightRoomSetting() {
  const setting = await NightRoomSetting.findOneAndUpdate(
    { key: "global" },
    { $setOnInsert: { mode: "auto", forced_on_since: null } },
    { upsert: true, new: true }
  ).lean();
  return setting;
}

function resolveRoomState({ mode, forcedOnSince }, now = new Date()) {
  if (mode === "force_off") {
    const { opensAt, closesAt } = getNightRoomWindow(now);
    return {
      isOpen: false,
      opensAt,
      closesAt,
      mode
    };
  }

  if (mode === "force_on") {
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const closesAt = new Date(now);
    closesAt.setHours(23, 59, 59, 999);
    const opensAt = forcedOnSince && new Date(forcedOnSince) > dayStart
      ? new Date(forcedOnSince)
      : dayStart;
    return {
      isOpen: true,
      opensAt,
      closesAt,
      mode
    };
  }

  const isOpen = isNightRoomOpen(now);
  const { opensAt, closesAt } = getNightRoomWindow(now);
  return { isOpen, opensAt, closesAt, mode: "auto" };
}

async function getResolvedNightRoomState(now = new Date()) {
  const setting = await getNightRoomSetting();
  return resolveRoomState(
    {
      mode: setting.mode,
      forcedOnSince: setting.forced_on_since
    },
    now
  );
}

function validateOpenOrReject(res, roomState) {
  if (!roomState.isOpen) {
    res.status(403).json({ message: "The 9-4 Room is closed right now." });
    return false;
  }
  return true;
}

async function buildPostMetrics(posts, currentUser) {
  if (posts.length === 0) {
    return {
      likeCountMap: new Map(),
      replyCountMap: new Map(),
      likedPostIdSet: new Set()
    };
  }

  const postIds = posts.map((post) => post._id);
  const likeCounts = await NightRoomLike.aggregate([
    { $match: { post: { $in: postIds } } },
    { $group: { _id: "$post", count: { $sum: 1 } } }
  ]);
  const replyCounts = await NightRoomReply.aggregate([
    { $match: { post: { $in: postIds } } },
    { $group: { _id: "$post", count: { $sum: 1 } } }
  ]);

  const likeCountMap = new Map(likeCounts.map((entry) => [entry._id.toString(), entry.count]));
  const replyCountMap = new Map(replyCounts.map((entry) => [entry._id.toString(), entry.count]));

  let likedPostIdSet = new Set();
  if (currentUser) {
    const likedRows = await NightRoomLike.find({
      user: currentUser._id,
      post: { $in: postIds }
    })
      .select("post")
      .lean();
    likedPostIdSet = new Set(likedRows.map((row) => row.post.toString()));
  }

  return { likeCountMap, replyCountMap, likedPostIdSet };
}

function getPresenceSessionId(req) {
  const headerSession = String(req.headers["x-night-room-session"] || "").trim();
  const querySession = String(req.query?.session_id || "").trim();
  return headerSession || querySession;
}

function maybeTouchPresence(req) {
  const sessionId = getPresenceSessionId(req);
  if (sessionId) {
    touchNightRoomSession(sessionId);
  }
}

function resolveVisibilityMatch(roomState) {
  return {
    createdAt: {
      $gte: roomState.opensAt,
      $lt: roomState.closesAt
    }
  };
}

async function getScopedNightRoomPost(postId, roomState) {
  return NightRoomPost.findOne({
    _id: postId,
    ...resolveVisibilityMatch(roomState)
  }).lean();
}

export async function getNightRoomStatus(req, res, next) {
  try {
    maybeTouchPresence(req);
    res.set("Cache-Control", "no-store");
    const now = new Date();
    const roomState = await getResolvedNightRoomState(now);
    res.json({
      is_open: roomState.isOpen,
      mode: roomState.mode,
      server_time: now.toISOString(),
      opens_at: roomState.opensAt.toISOString(),
      closes_at: roomState.closesAt.toISOString(),
      active_users: getNightRoomActiveUsersCount()
    });
  } catch (err) {
    next(err);
  }
}

export async function enterNightRoom(req, res, next) {
  try {
    const sessionId = getPresenceSessionId(req);
    if (!sessionId) {
      return res.status(400).json({ message: "x-night-room-session header is required" });
    }

    touchNightRoomSession(sessionId);
    res.json({ active_users: getNightRoomActiveUsersCount() });
  } catch (err) {
    next(err);
  }
}

export async function heartbeatNightRoom(req, res, next) {
  try {
    const sessionId = getPresenceSessionId(req);
    if (!sessionId) {
      return res.status(400).json({ message: "x-night-room-session header is required" });
    }

    touchNightRoomSession(sessionId);
    res.json({ active_users: getNightRoomActiveUsersCount() });
  } catch (err) {
    next(err);
  }
}

export async function leaveNightRoom(req, res, next) {
  try {
    const sessionId = getPresenceSessionId(req);
    if (sessionId) {
      leaveNightRoomSession(sessionId);
    }
    res.json({ active_users: getNightRoomActiveUsersCount() });
  } catch (err) {
    next(err);
  }
}

export async function listNightRoomPosts(req, res, next) {
  try {
    maybeTouchPresence(req);
    res.set("Cache-Control", "no-store");
    const roomState = await getResolvedNightRoomState();
    if (!roomState.isOpen) {
      return res.json({
        is_open: false,
        mode: roomState.mode,
        opens_at: roomState.opensAt.toISOString(),
        closes_at: roomState.closesAt.toISOString(),
        posts: [],
        active_users: getNightRoomActiveUsersCount()
      });
    }

    const posts = await NightRoomPost.find(resolveVisibilityMatch(roomState))
      .populate("user", "name email avatar")
      .sort({ createdAt: -1 })
      .lean();

    const { likeCountMap, replyCountMap, likedPostIdSet } = await buildPostMetrics(posts, req.user || null);
    const payload = posts.map((post) =>
      toNightRoomPostDTO(post, {
        likesCount: likeCountMap.get(post._id.toString()) || 0,
        repliesCount: replyCountMap.get(post._id.toString()) || 0,
        likedByUser: likedPostIdSet.has(post._id.toString())
      })
    );

    res.json({
      is_open: true,
      mode: roomState.mode,
      opens_at: roomState.opensAt.toISOString(),
      closes_at: roomState.closesAt.toISOString(),
      active_users: getNightRoomActiveUsersCount(),
      posts: payload
    });
  } catch (err) {
    next(err);
  }
}

export async function getNightRoomPost(req, res, next) {
  try {
    maybeTouchPresence(req);
    res.set("Cache-Control", "no-store");
    const roomState = await getResolvedNightRoomState();
    if (!roomState.isOpen) {
      return res.json({ is_open: false, mode: roomState.mode, post: null });
    }

    const postId = toObjectId(req.params.id);
    if (!postId) {
      return res.status(400).json({ message: "invalid id" });
    }

    const post = await NightRoomPost.findOne({
      _id: postId,
      ...resolveVisibilityMatch(roomState)
    })
      .populate("user", "name email avatar")
      .lean();
    if (!post) {
      return res.status(404).json({ message: "not found" });
    }

    const [likesCount, repliesCount, likedRow] = await Promise.all([
      NightRoomLike.countDocuments({ post: postId }),
      NightRoomReply.countDocuments({ post: postId }),
      req.user ? NightRoomLike.findOne({ post: postId, user: req.user._id }).lean() : null
    ]);

    return res.json({
      is_open: true,
      mode: roomState.mode,
      post: toNightRoomPostDTO(post, {
        likesCount,
        repliesCount,
        likedByUser: Boolean(likedRow)
      })
    });
  } catch (err) {
    next(err);
  }
}

export async function createNightRoomPost(req, res, next) {
  try {
    const roomState = await getResolvedNightRoomState();
    if (!validateOpenOrReject(res, roomState)) {
      return;
    }

    const { title } = req.body || {};
    const isAnonymous = req.body?.is_anonymous === 1 || req.body?.is_anonymous === true;

    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ message: "title is required" });
    }

    const post = await NightRoomPost.create({
      title: title.trim(),
      user: req.user._id,
      is_anonymous: isAnonymous
    });

    const hydrated = await NightRoomPost.findById(post._id).populate("user", "name email avatar").lean();
    res.status(201).json({
      post: toNightRoomPostDTO(hydrated, {
        likesCount: 0,
        repliesCount: 0,
        likedByUser: false
      })
    });
  } catch (err) {
    next(err);
  }
}

export async function toggleNightRoomPostLike(req, res, next) {
  try {
    const roomState = await getResolvedNightRoomState();
    if (!validateOpenOrReject(res, roomState)) {
      return;
    }

    const postId = toObjectId(req.params.id);
    if (!postId) {
      return res.status(400).json({ message: "invalid id" });
    }

    const post = await getScopedNightRoomPost(postId, roomState);
    if (!post) {
      return res.status(404).json({ message: "not found" });
    }

    const existing = await NightRoomLike.findOne({ post: postId, user: req.user._id }).lean();
    if (existing) {
      await NightRoomLike.deleteOne({ _id: existing._id });
    } else {
      await NightRoomLike.create({ post: postId, user: req.user._id });
    }

    const likesCount = await NightRoomLike.countDocuments({ post: postId });
    res.json({
      liked: !existing,
      likes_count: likesCount
    });
  } catch (err) {
    next(err);
  }
}

export async function listNightRoomReplies(req, res, next) {
  try {
    const roomState = await getResolvedNightRoomState();
    if (!roomState.isOpen) {
      return res.json({ is_open: false, replies: [] });
    }

    const postId = toObjectId(req.params.id);
    if (!postId) {
      return res.json({ is_open: true, replies: [] });
    }

    const post = await getScopedNightRoomPost(postId, roomState);
    if (!post) {
      return res.json({ is_open: true, replies: [] });
    }

    const replies = await NightRoomReply.find({ post: postId })
      .populate("user", "name email avatar")
      .sort({ createdAt: 1 })
      .lean();

    res.json({ is_open: true, replies: replies.map(toNightRoomReplyDTO) });
  } catch (err) {
    next(err);
  }
}

export async function createNightRoomReply(req, res, next) {
  try {
    const roomState = await getResolvedNightRoomState();
    if (!validateOpenOrReject(res, roomState)) {
      return;
    }

    const postId = toObjectId(req.params.id);
    if (!postId) {
      return res.status(400).json({ message: "invalid id" });
    }

    const { title } = req.body || {};
    const isAnonymous = req.body?.is_anonymous === 1 || req.body?.is_anonymous === true;
    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ message: "title is required" });
    }

    const post = await getScopedNightRoomPost(postId, roomState);
    if (!post) {
      return res.status(404).json({ message: "not found" });
    }

    const reply = await NightRoomReply.create({
      title: title.trim(),
      post: postId,
      user: req.user._id,
      is_anonymous: isAnonymous
    });

    const hydrated = await NightRoomReply.findById(reply._id).populate("user", "name email avatar").lean();
    res.status(201).json({ reply: toNightRoomReplyDTO(hydrated) });
  } catch (err) {
    next(err);
  }
}

export async function listAdminNightRoomPosts(req, res, next) {
  try {
    const search = String(req.query?.search || "").trim();
    const pageRaw = Number.parseInt(req.query?.page, 10);
    const limitRaw = Number.parseInt(req.query?.limit, 10);
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 10;
    const skip = (page - 1) * limit;

    const query = search ? { title: { $regex: search, $options: "i" } } : {};
    const [posts, total] = await Promise.all([
      NightRoomPost.find(query)
        .populate("user", "name email avatar")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      NightRoomPost.countDocuments(query)
    ]);

    const postIds = posts.map((post) => post._id);
    const [likeCounts, replyCounts] = await Promise.all([
      NightRoomLike.aggregate([
        { $match: { post: { $in: postIds } } },
        { $group: { _id: "$post", count: { $sum: 1 } } }
      ]),
      NightRoomReply.aggregate([
        { $match: { post: { $in: postIds } } },
        { $group: { _id: "$post", count: { $sum: 1 } } }
      ])
    ]);
    const likeMap = new Map(likeCounts.map((row) => [row._id.toString(), row.count]));
    const replyMap = new Map(replyCounts.map((row) => [row._id.toString(), row.count]));

    res.json({
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.max(1, Math.ceil(total / limit))
      },
      posts: posts.map((post) => ({
        id: post._id.toString(),
        title: post.title,
        is_anonymous: Boolean(post.is_anonymous),
        user: post.user
          ? {
              id: post.user._id.toString(),
              name: post.user.name,
              email: post.user.email,
              avatar: post.user.avatar || ""
            }
          : null,
        created_at: post.createdAt,
        likes_count: likeMap.get(post._id.toString()) || 0,
        replies_count: replyMap.get(post._id.toString()) || 0
      }))
    });
  } catch (err) {
    next(err);
  }
}

export async function getAdminNightRoomPostReplies(req, res, next) {
  try {
    const postId = toObjectId(req.params.id);
    if (!postId) {
      return res.status(400).json({ message: "invalid id" });
    }

    const post = await NightRoomPost.findById(postId).populate("user", "name email avatar").lean();
    if (!post) {
      return res.status(404).json({ message: "not found" });
    }

    const replies = await NightRoomReply.find({ post: postId })
      .populate("user", "name email avatar")
      .sort({ createdAt: 1 })
      .lean();

    res.json({
      post: {
        id: post._id.toString(),
        title: post.title,
        is_anonymous: Boolean(post.is_anonymous),
        user: post.user
          ? {
              id: post.user._id.toString(),
              name: post.user.name,
              email: post.user.email,
              avatar: post.user.avatar || ""
            }
          : null,
        created_at: post.createdAt
      },
      replies: replies.map((reply) => ({
        id: reply._id.toString(),
        title: reply.title,
        is_anonymous: Boolean(reply.is_anonymous),
        user: reply.user
          ? {
              id: reply.user._id.toString(),
              name: reply.user.name,
              email: reply.user.email,
              avatar: reply.user.avatar || ""
            }
          : null,
        created_at: reply.createdAt
      }))
    });
  } catch (err) {
    next(err);
  }
}

export async function getAdminNightRoomSetting(req, res, next) {
  try {
    const setting = await getNightRoomSetting();
    const roomState = await getResolvedNightRoomState();
    res.json({
      mode: setting.mode,
      forced_on_since: setting.forced_on_since,
      is_open: roomState.isOpen,
      opens_at: roomState.opensAt,
      closes_at: roomState.closesAt
    });
  } catch (err) {
    next(err);
  }
}

export async function updateAdminNightRoomSetting(req, res, next) {
  try {
    const mode = String(req.body?.mode || "").trim();
    if (!["auto", "force_on", "force_off"].includes(mode)) {
      return res.status(400).json({ message: "mode must be auto, force_on, or force_off" });
    }

    const nextForcedOnSince = mode === "force_on" ? new Date() : null;
    const setting = await NightRoomSetting.findOneAndUpdate(
      { key: "global" },
      {
        mode,
        forced_on_since: nextForcedOnSince
      },
      { upsert: true, new: true }
    ).lean();

    const roomState = resolveRoomState(
      { mode: setting.mode, forcedOnSince: setting.forced_on_since },
      new Date()
    );

    res.json({
      mode: setting.mode,
      forced_on_since: setting.forced_on_since,
      is_open: roomState.isOpen,
      opens_at: roomState.opensAt,
      closes_at: roomState.closesAt
    });
  } catch (err) {
    next(err);
  }
}
