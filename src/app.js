import express from "express";
import cors from "cors";
import itemRoutes from "./routes/item.routes.js";
import authRoutes from "./routes/auth.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import questionRoutes from "./routes/question.routes.js";
import commentRoutes from "./routes/comment.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import sessionRoutes from "./routes/session.routes.js";
import sanctumRoutes from "./routes/sanctum.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import feedbackRoutes from "./routes/feedback.routes.js";
import meRoutes from "./routes/me.routes.js";
import { notFound, errorHandler } from "./middlewares/errorHandler.js";

export function createServer() {
  const app = express();
  const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true
    })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get("/health", (req, res) => {
    res.json({ ok: true });
  });

  app.use("/auth", authRoutes);
  app.use("/sanctum", sanctumRoutes);
  app.use("/api", categoryRoutes);
  app.use("/api", questionRoutes);
  app.use("/api", commentRoutes);
  app.use("/api", profileRoutes);
  app.use("/api", sessionRoutes);
  app.use("/api", notificationRoutes);
  app.use("/api", feedbackRoutes);
  app.use("/api", meRoutes);
  app.use("/api/items", itemRoutes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
