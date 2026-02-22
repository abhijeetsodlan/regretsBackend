import { Router } from "express";
import {
  createNightRoomPost,
  createNightRoomReply,
  enterNightRoom,
  getAdminNightRoomPostReplies,
  getAdminNightRoomSetting,
  getNightRoomStatus,
  getNightRoomPost,
  heartbeatNightRoom,
  leaveNightRoom,
  listAdminNightRoomPosts,
  listNightRoomPosts,
  listNightRoomReplies,
  toggleNightRoomPostLike,
  updateAdminNightRoomSetting
} from "../controllers/night-room.controller.js";
import { optionalAuth, requireAuth } from "../middlewares/auth.js";
import { requireAdmin } from "../controllers/admin.controller.js";

const router = Router();

router.get("/night-room/status", optionalAuth, getNightRoomStatus);
router.post("/night-room/presence/enter", optionalAuth, enterNightRoom);
router.post("/night-room/presence/heartbeat", optionalAuth, heartbeatNightRoom);
router.post("/night-room/presence/leave", optionalAuth, leaveNightRoom);

router.get("/night-room/posts", optionalAuth, listNightRoomPosts);
router.post("/night-room/posts", requireAuth, createNightRoomPost);
router.post("/night-room/posts/:id/like", requireAuth, toggleNightRoomPostLike);
router.get("/night-room/posts/:id", optionalAuth, getNightRoomPost);
router.get("/night-room/posts/:id/replies", optionalAuth, listNightRoomReplies);
router.post("/night-room/posts/:id/replies", requireAuth, createNightRoomReply);
router.get("/admin/night-room/posts", requireAuth, requireAdmin, listAdminNightRoomPosts);
router.get("/admin/night-room/posts/:id/replies", requireAuth, requireAdmin, getAdminNightRoomPostReplies);
router.get("/admin/night-room/settings", requireAuth, requireAdmin, getAdminNightRoomSetting);
router.patch("/admin/night-room/settings", requireAuth, requireAdmin, updateAdminNightRoomSetting);

export default router;
