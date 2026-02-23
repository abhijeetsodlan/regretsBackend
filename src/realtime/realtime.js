const { WebSocketServer } = require("ws");
const { verifyToken } = require("../utils/token.js");

const userSockets = new Map();
const allSockets = new Set();

function registerSocket(userId, socket) {
  const key = String(userId);
  const current = userSockets.get(key) || new Set();
  current.add(socket);
  userSockets.set(key, current);
  allSockets.add(socket);
}

function unregisterSocket(userId, socket) {
  const key = String(userId);
  const current = userSockets.get(key);
  if (!current) {
    return;
  }
  current.delete(socket);
  if (current.size === 0) {
    userSockets.delete(key);
  }
  allSockets.delete(socket);
}

function safeSend(socket, payload) {
  try {
    if (socket.readyState === socket.OPEN) {
      socket.send(JSON.stringify(payload));
    }
  } catch {
    // Ignore one-off socket send failures.
  }
}

function emitNotificationToUser(userId, notification) {
  const sockets = userSockets.get(String(userId));
  if (!sockets || sockets.size === 0) {
    return;
  }

  const payload = {
    type: "notification:new",
    notification
  };
  sockets.forEach((socket) => safeSend(socket, payload));
}

function emitQuestionCreated(question) {
  const payload = {
    type: "question:new",
    question
  };
  allSockets.forEach((socket) => safeSend(socket, payload));
}

function attachRealtime(server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (socket, req) => {
    try {
      const rawUrl = req.url || "/ws";
      const url = new URL(rawUrl, "http://localhost");
      const token = url.searchParams.get("token");
      if (!token) {
        socket.close(1008, "Unauthenticated");
        return;
      }

      const payload = verifyToken(token);
      if (!payload?.sub) {
        socket.close(1008, "Unauthenticated");
        return;
      }

      const userId = String(payload.sub);
      registerSocket(userId, socket);

      socket.on("close", () => unregisterSocket(userId, socket));
      socket.on("error", () => unregisterSocket(userId, socket));
    } catch {
      socket.close(1011, "Unexpected error");
    }
  });

  return wss;
}

module.exports = { emitNotificationToUser, emitQuestionCreated, attachRealtime };


