var { neon } = require("@neondatabase/serverless");

function getDb() {
  return neon(process.env.DATABASE_URL);
}

// Run once on first cold start — creates tables if they don't exist
var tablesCreated = false;
async function ensureTables() {
  if (tablesCreated) return;
  var sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      whoop_user_id TEXT UNIQUE NOT NULL,
      access_token TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      token_expires_at BIGINT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS daily_metrics (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      date TEXT NOT NULL,
      recovery REAL NOT NULL,
      sleep_score REAL NOT NULL,
      strain REAL NOT NULL,
      hrv REAL DEFAULT 0,
      rhr REAL DEFAULT 0,
      fetched_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, date)
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS creature_states (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      date TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT 'Whoopy',
      mood TEXT NOT NULL DEFAULT 'neutral',
      evolution_stage TEXT NOT NULL DEFAULT 'egg',
      health_points REAL NOT NULL DEFAULT 50,
      streak_days INTEGER NOT NULL DEFAULT 0,
      is_alive BOOLEAN NOT NULL DEFAULT true,
      traits JSONB NOT NULL DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, date)
    )`;
  tablesCreated = true;
}

module.exports = async function handler(req, res) {
  try {
    await ensureTables();
  } catch (err) {
    console.error("DB init error:", err);
    return res.status(500).json({ error: "Database initialization failed", message: String(err) });
  }

  var url = req.url || "";

  try {
    // OAuth callback
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

      var sql = getDb();
      var whoopId = String(profile.user_id);
      var userId = "whoop-" + whoopId;
      var expiresAt = Date.now() + tokens.expires_in * 1000;

      // Upsert user
      await sql`
        INSERT INTO users (id, whoop_user_id, access_token, refresh_token, token_expires_at)
        VALUES (${userId}, ${whoopId}, ${tokens.access_token}, ${tokens.refresh_token}, ${expiresAt})
        ON CONFLICT (whoop_user_id) DO UPDATE SET
          access_token = ${tokens.access_token},
          refresh_token = ${tokens.refresh_token},
          token_expires_at = ${expiresAt}`;

      res.setHeader(
        "Set-Cookie",
        "bodypet_user=" + userId + "; Path=/; HttpOnly; Max-Age=31536000; SameSite=Lax"
      );
      return res.redirect(302, "/");
    }

    // OAuth start
    if (!process.env.WHOOP_CLIENT_ID) {
      return res.status(400).json({ error: "WHOOP not configured" });
    }

    var params = new URLSearchParams({
      client_id: process.env.WHOOP_CLIENT_ID,
      redirect_uri: process.env.WHOOP_REDIRECT_URI || "",
      response_type: "code",
      scope: "read:recovery read:sleep read:workout read:profile read:cycles",
      state: Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2),
    });

    return res.redirect(302, "https://api.prod.whoop.com/oauth/oauth2/auth?" + params);
  } catch (err) {
    console.error("Auth error:", err);
    return res.status(500).json({ error: "Authentication failed", message: String(err) });
  }
};
