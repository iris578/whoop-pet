module.exports = async function handler(req, res) {
  var url = req.url || "";

  try {
    // OAuth callback: /auth/whoop/callback?code=...
    if (url.includes("/callback") || req.query.code) {
      var code = req.query.code;
      if (!code) return res.status(400).json({ error: "Missing authorization code" });

      var tokenRes = await fetch("https://api.prod.whoop.com/oauth/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: code,
          client_id: process.env.WHOOP_CLIENT_ID || "",
          client_secret: process.env.WHOOP_CLIENT_SECRET || "",
          redirect_uri: process.env.WHOOP_REDIRECT_URI || "",
        }),
      });

      if (!tokenRes.ok) {
        var text = await tokenRes.text();
        return res.status(500).json({ error: "Token exchange failed", detail: text });
      }

      var tokens = await tokenRes.json();

      var profileRes = await fetch(
        "https://api.prod.whoop.com/developer/v1/user/profile/basic",
        { headers: { Authorization: "Bearer " + tokens.access_token } }
      );
      if (!profileRes.ok) {
        return res.status(500).json({ error: "Failed to fetch WHOOP profile" });
      }
      var profile = await profileRes.json();

      // Store user ID in cookie (the API function's in-memory store handles the rest)
      var userId = "whoop-" + profile.user_id;
      res.setHeader(
        "Set-Cookie",
        "bodypet_user=" + userId + "; Path=/; HttpOnly; Max-Age=31536000; SameSite=Lax"
      );
      return res.redirect(302, "/");
    }

    // OAuth start: /auth/whoop → redirect to WHOOP
    if (!process.env.WHOOP_CLIENT_ID) {
      return res.status(400).json({
        error: "WHOOP not configured",
        message: "Set WHOOP_CLIENT_ID and WHOOP_CLIENT_SECRET in Vercel environment variables.",
      });
    }

    var params = new URLSearchParams({
      client_id: process.env.WHOOP_CLIENT_ID,
      redirect_uri: process.env.WHOOP_REDIRECT_URI || "",
      response_type: "code",
      scope: "read:recovery read:sleep read:workout read:profile read:cycles",
      state: Math.random().toString(36).substring(7),
    });

    return res.redirect(302, "https://api.prod.whoop.com/oauth/oauth2/auth?" + params);
  } catch (err) {
    console.error("Auth error:", err);
    return res.status(500).json({
      error: "Authentication failed",
      message: err instanceof Error ? err.message : String(err),
    });
  }
};
