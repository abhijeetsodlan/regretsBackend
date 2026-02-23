const express = require("express");
const cors = require("cors");
const itemRoutes = require("./routes/item.routes.js");
const authRoutes = require("./routes/auth.routes.js");
const categoryRoutes = require("./routes/category.routes.js");
const questionRoutes = require("./routes/question.routes.js");
const commentRoutes = require("./routes/comment.routes.js");
const profileRoutes = require("./routes/profile.routes.js");
const sessionRoutes = require("./routes/session.routes.js");
const sanctumRoutes = require("./routes/sanctum.routes.js");
const notificationRoutes = require("./routes/notification.routes.js");
const feedbackRoutes = require("./routes/feedback.routes.js");
const meRoutes = require("./routes/me.routes.js");
const adminRoutes = require("./routes/admin.routes.js");
const nightRoomRoutes = require("./routes/night-room.routes.js");
const { notFound, errorHandler } = require("./middlewares/errorHandler.js");

function createServer() {
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
  app.use("/api", adminRoutes);
  app.use("/api", nightRoomRoutes);
  app.use("/api/items", itemRoutes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createServer };


