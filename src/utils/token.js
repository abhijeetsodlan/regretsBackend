import crypto from "crypto";

function base64urlEncode(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64urlDecode(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const requiredPadding = (4 - (padded.length % 4)) % 4;
  const data = `${padded}${"=".repeat(requiredPadding)}`;
  return Buffer.from(data, "base64").toString("utf8");
}

function sign(input, secret) {
  return crypto
    .createHmac("sha256", secret)
    .update(input)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export function createToken(payload, ttlSeconds = 60 * 60 * 24 * 30) {
  const secret = process.env.JWT_SECRET || "local-dev-secret";
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + ttlSeconds };
  const headerPart = base64urlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payloadPart = base64urlEncode(JSON.stringify(body));
  const signaturePart = sign(`${headerPart}.${payloadPart}`, secret);
  return `${headerPart}.${payloadPart}.${signaturePart}`;
}

export function verifyToken(token) {
  try {
    const secret = process.env.JWT_SECRET || "local-dev-secret";
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    const [headerPart, payloadPart, signaturePart] = parts;
    const expectedSignature = sign(`${headerPart}.${payloadPart}`, secret);
    if (signaturePart !== expectedSignature) {
      return null;
    }

    const payload = JSON.parse(base64urlDecode(payloadPart));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch (err) {
    return null;
  }
}
