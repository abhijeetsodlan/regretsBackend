import { Router } from "express";
import {
  clearNotifications,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from "../controllers/notification.controller.js";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.get("/notifications", requireAuth, listNotifications);
router.post("/notifications/:id/read", requireAuth, markNotificationRead);
router.post("/notifications/read-all", requireAuth, markAllNotificationsRead);
router.post("/notifications/clear", requireAuth, clearNotifications);

export default router;
