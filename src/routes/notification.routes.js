const { Router } = require("express");
const {
  clearNotifications,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead
} = require("../controllers/notification.controller.js");
const { requireAuth } = require("../middlewares/auth.js");

const router = Router();

router.get("/notifications", requireAuth, listNotifications);
router.post("/notifications/:id/read", requireAuth, markNotificationRead);
router.post("/notifications/read-all", requireAuth, markAllNotificationsRead);
router.post("/notifications/clear", requireAuth, clearNotifications);

module.exports = router;


