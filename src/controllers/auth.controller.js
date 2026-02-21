import { User } from "../models/user.model.js";
import { createToken } from "../utils/token.js";

function getAuthConfig() {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || "http://localhost:3000/auth/google/callback",
    frontendBaseUrl: process.env.FRONTEND_URL || "http://localhost:5173"
  };
}

function buildFrontendRedirect(frontendBaseUrl, payload = {}) {
  const redirectUrl = new URL("/questions/auth-success", frontendBaseUrl);
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      redirectUrl.searchParams.set(key, String(value));
    }
  });
  return redirectUrl.toString();
}

export async function startGoogleAuth(req, res, next) {
  try {
    const { clientId, callbackUrl, frontendBaseUrl } = getAuthConfig();
    if (!clientId) {
      return res.status(500).json({
        message: "Google auth is not configured. Set GOOGLE_CLIENT_ID in backend .env"
      });
    }

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", callbackUrl);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "openid email profile");
    authUrl.searchParams.set("prompt", "select_account");
    authUrl.searchParams.set("access_type", "offline");

    if (typeof req.query.redirect === "string" && req.query.redirect.trim()) {
      authUrl.searchParams.set("state", req.query.redirect.trim());
    }

    return res.redirect(authUrl.toString());
  } catch (err) {
    next(err);
  }
}

export async function googleCallback(req, res, next) {
  try {
    const { clientId, clientSecret, callbackUrl, frontendBaseUrl } = getAuthConfig();
    if (!clientId || !clientSecret) {
      return res.status(500).json({
        message: "Google auth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend .env"
      });
    }

    const code = typeof req.query.code === "string" ? req.query.code : "";
    if (!code) {
      return res.redirect(
        buildFrontendRedirect(frontendBaseUrl, { error: "google_auth_failed" })
      );
    }

    const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callbackUrl,
        grant_type: "authorization_code"
      })
    });

    if (!tokenResp.ok) {
      return res.redirect(
        buildFrontendRedirect(frontendBaseUrl, { error: "google_token_exchange_failed" })
      );
    }

    const tokenData = await tokenResp.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      return res.redirect(
        buildFrontendRedirect(frontendBaseUrl, { error: "google_access_token_missing" })
      );
    }

    const profileResp = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!profileResp.ok) {
      return res.redirect(
        buildFrontendRedirect(frontendBaseUrl, { error: "google_profile_fetch_failed" })
      );
    }

    const profile = await profileResp.json();
    const email = typeof profile.email === "string" ? profile.email.toLowerCase() : "";
    const name = typeof profile.name === "string" && profile.name.trim()
      ? profile.name.trim()
      : "Google User";
    const googleId = typeof profile.sub === "string" ? profile.sub : "";

    if (!email) {
      return res.redirect(
        buildFrontendRedirect(frontendBaseUrl, { error: "google_email_missing" })
      );
    }

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name,
        email,
        googleId,
        avatar: ""
      });
    } else {
      user.name = name || user.name;
      user.googleId = googleId || user.googleId;
      await user.save();
    }

    const token = createToken({
      sub: user._id.toString(),
      email: user.email,
      name: user.name
    });

    return res.redirect(
      buildFrontendRedirect(frontendBaseUrl, {
        token,
        name: user.name,
        email: user.email
      })
    );
  } catch (err) {
    next(err);
  }
}
