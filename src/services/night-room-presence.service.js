const ACTIVE_WINDOW_MS = 70 * 1000;

const sessions = new Map();

function cleanup(now = Date.now()) {
  for (const [sessionId, lastSeen] of sessions.entries()) {
    if (now - lastSeen > ACTIVE_WINDOW_MS) {
      sessions.delete(sessionId);
    }
  }
}

export function touchNightRoomSession(sessionId) {
  if (!sessionId) {
    return;
  }
  const now = Date.now();
  cleanup(now);
  sessions.set(String(sessionId), now);
}

export function leaveNightRoomSession(sessionId) {
  if (!sessionId) {
    return;
  }
  sessions.delete(String(sessionId));
}

export function getNightRoomActiveUsersCount() {
  cleanup(Date.now());
  return sessions.size;
}
