import { Router } from "express";
import { getAuthUrl, exchangeCode } from "../services/whoop.js";
import { createUser } from "../db/queries.js";

const router = Router();

// Redirect to WHOOP OAuth
router.get("/whoop", (_req, res) => {
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

    // Get WHOOP user profile to get their user ID
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

export default router;
