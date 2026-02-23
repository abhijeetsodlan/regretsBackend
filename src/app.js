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

function normalizeOrigin(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function getAllowedOrigins() {
  const configured = process.env.CORS_ORIGIN || "";
  const frontendUrl = process.env.FRONTEND_URL || "";

  const combined = [configured, frontendUrl]
    .join(",")
    .split(",")
    .map((value) => normalizeOrigin(value))
    .filter(Boolean);

  const unique = Array.from(new Set(combined));
  if (unique.length > 0) {
    return unique;
  }

  return ["http://localhost:5173"];
}

function isAllowedOrigin(origin, allowedOrigins) {
  if (allowedOrigins.includes("*")) {
    return true;
  }

  return allowedOrigins.some((allowed) => {
    if (allowed === origin) {
      return true;
    }

    if (!allowed.includes("*")) {
      return false;
    }

    const [prefix, suffix] = allowed.split("*");
    return origin.startsWith(prefix) && origin.endsWith(suffix || "");
  });
}

function createServer() {
  const app = express();
  const allowedOrigins = getAllowedOrigins();
  const corsOptions = {
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = normalizeOrigin(origin);
      if (isAllowedOrigin(normalizedOrigin, allowedOrigins)) {
        return callback(null, true);
      }

      // Do not throw 500 for disallowed origins; just deny CORS headers.
      return callback(null, false);
    },
    credentials: true
  };

  app.use(cors(corsOptions));
  app.options("*", cors(corsOptions));
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

