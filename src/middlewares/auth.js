import { User } from "../models/user.model.js";
import { verifyToken } from "../utils/token.js";

function extractBearerToken(headerValue) {
  if (!headerValue || typeof headerValue !== "string") {
    return null;
  }
  if (!headerValue.startsWith("Bearer ")) {
    return null;
  }
  const token = headerValue.slice("Bearer ".length).trim();
  return token || null;
}

async function getUserFromToken(req) {
  const token = extractBearerToken(req.headers.authorization);
  if (!token) {
    return null;
  }
  const payload = verifyToken(token);
  if (!payload || !payload.sub) {
    return null;
  }
  const user = await User.findById(payload.sub);
  return user || null;
}

export async function optionalAuth(req, res, next) {
  try {
    req.user = await getUserFromToken(req);
    next();
  } catch (err) {
    next(err);
  }
}

export async function requireAuth(req, res, next) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return res.status(401).json({ message: "Unauthenticated" });
    }
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

