import { Router } from "express";
import { getAuthUrl, exchangeCode } from "../services/whoop.js";
import { createUser } from "../db/store.js";

const router = Router();

// Check if WHOOP is configured
function whoopConfigured(): boolean {
  return !!(process.env.WHOOP_CLIENT_ID && process.env.WHOOP_CLIENT_SECRET);
}

// Redirect to WHOOP OAuth
router.get("/whoop", (req, res) => {
  if (!whoopConfigured()) {
    res.status(400).json({
      error: "WHOOP not configured",
      message: "Set WHOOP_CLIENT_ID and WHOOP_CLIENT_SECRET environment variables to enable WHOOP integration.",
    });
    return;
  }
  res.redirect(getAuthUrl());
});

// OAuth callback
router.get("/whoop/callback", async (req, res) => {
  try {
    const code = req.query.code as string;
    if (!code) {
      res.status(400).json({ error: "Missing authorization code" });
      return;
    }

    const tokens = await exchangeCode(code);

    // Get WHOOP user profile
    const profileRes = await fetch(
      "https://api.prod.whoop.com/developer/v1/user/profile/basic",
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
    );
    if (!profileRes.ok) {
      throw new Error("Failed to fetch WHOOP profile");
    }
    const profile = await profileRes.json();

    const user = createUser(
      String(profile.user_id),
      tokens.access_token,
      tokens.refresh_token,
      Date.now() + tokens.expires_in * 1000
    );

    // Set user ID cookie and redirect to app
    res.cookie("bodypet_user", user.id, {
      httpOnly: true,
      maxAge: 365 * 24 * 60 * 60 * 1000,
      sameSite: "lax",
    });
    res.redirect("/");
  } catch (err) {
    console.error("OAuth callback error:", err);
    res.status(500).json({ error: "Authentication failed" });
  }
});

// Status endpoint
router.get("/status", (_req, res) => {
  res.json({ whoop_configured: whoopConfigured() });
});

export default router;
