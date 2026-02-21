import { Router } from "express";
import {
  deleteAdminComment,
  deleteAdminQuestion,
  deleteAdminUser,
  getAdminQuestionReplies,
  getAdminUserPosts,
  listAdminFeedbacks,
  listAdminComments,
  listAdminQuestions,
  listAdminUsers,
  requireAdmin,
  sendAdminNotification
} from "../controllers/admin.controller.js";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.use(requireAuth, requireAdmin);

router.get("/admin/users", listAdminUsers);
router.get("/admin/users/:id/posts", getAdminUserPosts);
router.get("/admin/questions", listAdminQuestions);
router.get("/admin/questions/:id/replies", getAdminQuestionReplies);
router.get("/admin/comments", listAdminComments);
router.get("/admin/feedbacks", listAdminFeedbacks);
router.delete("/admin/users/:id", deleteAdminUser);
router.delete("/admin/questions/:id", deleteAdminQuestion);
router.delete("/admin/comments/:id", deleteAdminComment);
router.post("/admin/notify", sendAdminNotification);

export default router;
