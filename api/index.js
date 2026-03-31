module.exports = async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const url = req.url || "";
  const cookies = parseCookies(req.headers.cookie);

  try {
    // --- Health check ---
    if (url === "/api" || url === "/api/" || url.startsWith("/api/health")) {
      return res.status(200).json({
        status: "ok",
        url: req.url,
        method: req.method,
        timestamp: new Date().toISOString(),
      });
    }

    // --- AUTH routes ---
    if (url.startsWith("/auth/whoop/callback")) {
      const code = req.query.code;
      if (!code) return res.status(400).json({ error: "Missing code" });

      const tokenRes = await fetch("https://api.prod.whoop.com/oauth/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          client_id: process.env.WHOOP_CLIENT_ID || "",
          client_secret: process.env.WHOOP_CLIENT_SECRET || "",
          redirect_uri: process.env.WHOOP_REDIRECT_URI || "",
        }),
      });

      if (!tokenRes.ok) {
        const text = await tokenRes.text();
        return res.status(500).json({ error: "Token exchange failed", detail: text });
      }

      const tokens = await tokenRes.json();

      const profileRes = await fetch(
        "https://api.prod.whoop.com/developer/v1/user/profile/basic",
        { headers: { Authorization: "Bearer " + tokens.access_token } }
      );
      if (!profileRes.ok) {
        return res.status(500).json({ error: "Failed to fetch profile" });
      }
      const profile = await profileRes.json();

      const user = createUser(
        String(profile.user_id),
        tokens.access_token,
        tokens.refresh_token,
        Date.now() + tokens.expires_in * 1000
      );

      res.setHeader(
        "Set-Cookie",
        "bodypet_user=" + user.id + "; Path=/; HttpOnly; Max-Age=31536000; SameSite=Lax"
      );
      return res.redirect(302, "/");
    }

    if (url.startsWith("/auth/whoop")) {
      if (!process.env.WHOOP_CLIENT_ID) {
        return res.status(400).json({ error: "WHOOP not configured" });
      }
      const params = new URLSearchParams({
        client_id: process.env.WHOOP_CLIENT_ID,
        redirect_uri: process.env.WHOOP_REDIRECT_URI || "",
        response_type: "code",
        scope: "read:recovery read:sleep read:workout read:profile read:cycles",
        state: Math.random().toString(36).substring(7),
      });
      return res.redirect(302, "https://api.prod.whoop.com/oauth/oauth2/auth?" + params);
    }

    if (url.startsWith("/auth/status")) {
      return res.json({ whoop_configured: !!process.env.WHOOP_CLIENT_ID });
    }

    // --- Resolve user from session cookie ---
    var userId;
    var isDemo;
    var sessionCookie = cookies.bodypet_session;
    if (sessionCookie) {
      try {
        var session = JSON.parse(Buffer.from(sessionCookie, "base64").toString());
        userId = "whoop-" + session.uid;
        isDemo = false;
        // Ensure user exists in memory with tokens from cookie
        if (!users.has(userId)) {
          var user = {
            id: userId,
            whoop_user_id: session.uid,
            access_token: session.at,
            refresh_token: session.rt,
            token_expires_at: session.exp,
            timezone: "UTC",
            created_at: new Date().toISOString(),
          };
          users.set(userId, user);
        }
      } catch (e) {
        // Bad cookie, fall through to demo
        ensureDemoUser();
        userId = DEMO_USER_ID;
        isDemo = true;
      }
    } else {
      ensureDemoUser();
      userId = DEMO_USER_ID;
      isDemo = true;
    }

    var today = new Date().toISOString().split("T")[0];

    if (url.startsWith("/api/creature/refresh")) {
      var display = await updateCreature(userId, today);
      return res.json(display);
    }

    if (url.startsWith("/api/creature/name") && req.method === "POST") {
      var body = req.body || {};
      if (!body.name || typeof body.name !== "string" || body.name.length > 20) {
        return res.status(400).json({ error: "Name must be 1-20 characters" });
      }
      var creature = latestCreatureStore.get(userId);
      if (creature) creature.name = body.name;
      return res.json({ name: body.name });
    }

    if (url.startsWith("/api/creature")) {
      var display2 = await updateCreature(userId, today);
      return res.json(display2);
    }

    if (url.startsWith("/api/me")) {
      var c = latestCreatureStore.get(userId);
      return res.json({
        user_id: userId,
        is_demo: isDemo,
        has_creature: !!c,
        creature_name: c ? c.name : null,
        whoop_connected: !isDemo,
      });
    }

    if (url.startsWith("/api/history")) {
      var all = [];
      for (var m of metricsStore.values()) {
        if (m.user_id === userId) all.push(m);
      }
      all.sort(function (a, b) { return b.date.localeCompare(a.date); });
      return res.json({ metrics: all.slice(0, 7) });
    }

    return res.status(404).json({ error: "Not found", url: url });
  } catch (err) {
    console.error("Handler error:", err);
    return res.status(500).json({
      error: "Internal server error",
      message: err instanceof Error ? err.message : String(err),
    });
  }
};

// ============================================================
// Helpers & State (all inline, zero imports)
// ============================================================

var users = new Map();
var usersByWhoop = new Map();
var metricsStore = new Map();
var creaturesStore = new Map();
var latestCreatureStore = new Map();
var DEMO_USER_ID = "demo-user-000";

function genId() {
  var d = Date.now();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function parseCookies(header) {
  var cookies = {};
  if (!header) return cookies;
  header.split(";").forEach(function (cookie) {
    var parts = cookie.trim().split("=");
    var name = parts.shift();
    if (name) cookies[name] = parts.join("=");
  });
  return cookies;
}

function ensureDemoUser() {
  if (!users.has(DEMO_USER_ID)) {
    var user = {
      id: DEMO_USER_ID,
      whoop_user_id: "demo",
      access_token: "demo",
      refresh_token: "demo",
      token_expires_at: Date.now() + 999999999,
      timezone: "UTC",
      created_at: new Date().toISOString(),
    };
    users.set(DEMO_USER_ID, user);
  }
  return users.get(DEMO_USER_ID);
}

function createUser(whoopUserId, accessToken, refreshToken, expiresAt) {
  var existing = usersByWhoop.get(whoopUserId);
  if (existing) {
    existing.access_token = accessToken;
    existing.refresh_token = refreshToken;
    existing.token_expires_at = expiresAt;
    return existing;
  }
  var user = {
    id: genId(),
    whoop_user_id: whoopUserId,
    access_token: accessToken,
    refresh_token: refreshToken,
    token_expires_at: expiresAt,
    timezone: "UTC",
    created_at: new Date().toISOString(),
  };
  users.set(user.id, user);
  usersByWhoop.set(whoopUserId, user);
  return user;
}

// --- Demo metrics ---
function generateDemoMetrics() {
  var daySeed = new Date().toISOString().split("T")[0];
  var hash = 0;
  for (var i = 0; i < daySeed.length; i++) {
    hash = (hash * 31 + daySeed.charCodeAt(i)) | 0;
  }
  function rand(min, max) {
    hash = (hash * 16807 + 7) | 0;
    return min + Math.abs(hash % (max - min + 1));
  }
  return {
    recovery: rand(40, 95),
    sleep_score: rand(50, 98),
    strain: parseFloat((rand(5, 18) + rand(0, 9) / 10).toFixed(1)),
    hrv: rand(30, 120),
    rhr: rand(48, 72),
  };
}

// --- WHOOP API ---
async function fetchWhoopMetrics(user) {
  var accessToken = user.access_token;
  if (Date.now() >= user.token_expires_at - 60000) {
    try {
      var refreshRes = await fetch("https://api.prod.whoop.com/oauth/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: user.refresh_token,
          client_id: process.env.WHOOP_CLIENT_ID || "",
          client_secret: process.env.WHOOP_CLIENT_SECRET || "",
        }),
      });
      if (refreshRes.ok) {
        var tokens = await refreshRes.json();
        user.access_token = tokens.access_token;
        user.refresh_token = tokens.refresh_token;
        user.token_expires_at = Date.now() + tokens.expires_in * 1000;
        accessToken = tokens.access_token;
      }
    } catch (e) { /* use existing token */ }
  }

  var headers = { Authorization: "Bearer " + accessToken };
  var results = await Promise.all([
    fetch("https://api.prod.whoop.com/developer/v1/recovery?limit=1", { headers: headers }).catch(function () { return null; }),
    fetch("https://api.prod.whoop.com/developer/v1/activity/sleep?limit=1", { headers: headers }).catch(function () { return null; }),
    fetch("https://api.prod.whoop.com/developer/v1/cycle?limit=1", { headers: headers }).catch(function () { return null; }),
  ]);

  var recovery = 50, sleepScore = 50, strain = 10, hrv = 0, rhr = 0;
  try {
    if (results[0] && results[0].ok) {
      var d = await results[0].json();
      var rec = d.records && d.records[0];
      if (rec && rec.score) {
        recovery = rec.score.recovery_score || 50;
        hrv = rec.score.hrv_rmssd_milli || 0;
        rhr = rec.score.resting_heart_rate || 0;
      }
    }
  } catch (e) {}
  try {
    if (results[1] && results[1].ok) {
      var d2 = await results[1].json();
      sleepScore = (d2.records && d2.records[0] && d2.records[0].score && d2.records[0].score.sleep_performance_percentage) || 50;
    }
  } catch (e) {}
  try {
    if (results[2] && results[2].ok) {
      var d3 = await results[2].json();
      strain = (d3.records && d3.records[0] && d3.records[0].score && d3.records[0].score.strain) || 10;
    }
  } catch (e) {}

  return { recovery: recovery, sleep_score: sleepScore, strain: strain, hrv: hrv, rhr: rhr };
}

// --- Creature engine ---
function calculateMood(metrics) {
  var avg = (metrics.recovery + metrics.sleep_score) / 2;
  if (avg >= 80) return "thriving";
  if (avg >= 60) return "happy";
  if (avg >= 40) return "neutral";
  if (avg >= 20) return "tired";
  return "struggling";
}

function calculateHP(metrics, previousHP) {
  var recoveryFactor = (metrics.recovery - 50) / 50;
  var sleepFactor = (metrics.sleep_score - 50) / 50;
  var strainPenalty = metrics.strain > 18 ? -10 : metrics.strain > 15 ? -5 : 0;
  var delta = recoveryFactor * 15 + sleepFactor * 15 + strainPenalty;
  return Math.max(0, Math.min(100, previousHP + delta));
}

function calculateEvolution(streakDays) {
  if (streakDays >= 60) return "legendary";
  if (streakDays >= 30) return "adult";
  if (streakDays >= 14) return "teen";
  if (streakDays >= 3) return "baby";
  return "egg";
}

function calculateTraits(metrics, streak) {
  var traits = [];
  if (metrics.recovery >= 90) traits.push("supercharged");
  if (metrics.sleep_score >= 90) traits.push("well-rested");
  if (metrics.strain >= 18) traits.push("beast-mode");
  if (streak >= 7) traits.push("consistent");
  if (streak >= 30) traits.push("iron-will");
  if (metrics.recovery <= 20) traits.push("exhausted");
  if (metrics.sleep_score <= 20) traits.push("sleep-deprived");
  return traits;
}

function getAsciiArt(creature) {
  if (!creature.is_alive) {
    return "    ╔═══════════════╗\n    ║   ✖  ✖       ║\n    ║    ───        ║\n    ║  R.I.P.       ║\n    ║  " + creature.name.padEnd(11) + "  ║\n    ╚═══════════════╝";
  }
  var faces = {
    egg: {
      thriving: "    🥚✨\n   (^‿^)\n  Ready to\n   hatch!",
      happy: "    🥚\n   (^‿^)\n  Warming\n    up!",
      neutral: "    🥚\n   (•_•)\n  Sitting\n   here...",
      tired: "    🥚\n   (-_-)\n   Cold...",
      struggling: "    🥚💔\n   (;_;)\n  Cracking\n   apart...",
    },
    baby: {
      thriving: "   ∩∩\n  (★‿★)  ✨\n  /|  |\\\n   d  b\n  So strong!",
      happy: "   ∩∩\n  (^‿^)\n  /|  |\\\n   d  b\n  Growing!",
      neutral: "   ∩∩\n  (•_•)\n  /|  |\\\n   d  b\n  Hanging in",
      tired: "   ∩∩\n  (-_-) zzZ\n  /|  |\\\n   d  b\n  Sleepy...",
      struggling: "   ∩∩\n  (T_T)\n  /|  |\\\n   d  b\n  Help me...",
    },
    teen: {
      thriving: "   ∩∩∩\n  (★‿★)  ⚡\n  /|██|\\\n  / ‖‖ \\\n  On fire!",
      happy: "   ∩∩∩\n  (^‿^)\n  /|██|\\\n  / ‖‖ \\\n  Feeling good",
      neutral: "   ∩∩∩\n  (•_•)\n  /|██|\\\n  / ‖‖ \\\n  Meh...",
      tired: "   ∩∩∩\n  (-_-)zzZ\n  /|██|\\\n  / ‖‖ \\\n  Need rest",
      struggling: "   ∩∩∩\n  (×_×)\n  /|██|\\\n  / ‖‖ \\\n  Barely alive",
    },
    adult: {
      thriving: "  ╔∩∩∩╗\n  ║★‿★║ 🔥\n  ╠████╣\n  ║ ‖‖ ║\n  ╚╧══╧╝\n  UNSTOPPABLE",
      happy: "  ╔∩∩∩╗\n  ║^‿^║\n  ╠████╣\n  ║ ‖‖ ║\n  ╚╧══╧╝\n  Strong!",
      neutral: "  ╔∩∩∩╗\n  ║•_•║\n  ╠████╣\n  ║ ‖‖ ║\n  ╚╧══╧╝\n  Steady",
      tired: "  ╔∩∩∩╗\n  ║-_-║ zzZ\n  ╠████╣\n  ║ ‖‖ ║\n  ╚╧══╧╝\n  Drained",
      struggling: "  ╔∩∩∩╗\n  ║×_×║ 💔\n  ╠████╣\n  ║ ‖‖ ║\n  ╚╧══╧╝\n  Fading...",
    },
    legendary: {
      thriving: "  👑\n  ╔∩∩∩╗ ✨⚡🔥\n  ║★‿★║\n  ╠████╣\n  ║ ‖‖ ║\n  ╚╧══╧╝\n  ★ LEGENDARY ★",
      happy: "  👑\n  ╔∩∩∩╗ ✨\n  ║^‿^║\n  ╠████╣\n  ║ ‖‖ ║\n  ╚╧══╧╝\n  ★ LEGENDARY ★",
      neutral: "  👑\n  ╔∩∩∩╗\n  ║•_•║\n  ╠████╣\n  ║ ‖‖ ║\n  ╚╧══╧╝\n  Legendary",
      tired: "  👑\n  ╔∩∩∩╗ zzZ\n  ║-_-║\n  ╠████╣\n  ║ ‖‖ ║\n  ╚╧══╧╝\n  Even legends rest",
      struggling: "  👑\n  ╔∩∩∩╗ 💔\n  ║×_×║\n  ╠████╣\n  ║ ‖‖ ║\n  ╚╧══╧╝\n  Legend down...",
    },
  };
  var stage = faces[creature.evolution_stage];
  if (stage && stage[creature.mood]) return stage[creature.mood];
  return "(•_•)";
}

function getStatusMessage(creature) {
  if (!creature.is_alive) return creature.name + " has perished... Start a new streak to resurrect!";
  var messages = {
    thriving: ["Your body is a machine today!", "Peak performance unlocked!", "Nothing can stop you!"],
    happy: ["Looking good! Keep it up!", "Your creature is vibing!", "Solid day ahead!"],
    neutral: ["An average day. Nothing wrong with that.", "Steady as she goes.", "Room for improvement, but you're here."],
    tired: ["Your body needs rest...", "Maybe take it easy today?", "Recovery mode activated."],
    struggling: ["Your creature is barely hanging on!", "Emergency! Get some sleep!", "Code red: body in crisis!"],
  };
  var pool = messages[creature.mood] || ["Keep going!"];
  return pool[Math.floor(Math.random() * pool.length)];
}

function getShareText(creature, metrics) {
  var status = creature.is_alive ? creature.mood.toUpperCase() : "DEAD 💀";
  var lines = [
    "🐾 My Whoopy is " + status + "!",
    "❤️ HP: " + Math.round(creature.health_points) + "/100",
    "🔥 Streak: " + creature.streak_days + " days",
    "📊 Recovery: " + Math.round(metrics.recovery) + "% | Sleep: " + Math.round(metrics.sleep_score) + "% | Strain: " + metrics.strain.toFixed(1),
    "🧬 Stage: " + creature.evolution_stage,
  ];
  if (creature.traits.length > 0) lines.push("✨ Traits: " + creature.traits.join(", "));
  lines.push("", "Get your own Whoopy! 🐣");
  return lines.join("\n");
}

// --- Core: update creature ---
async function updateCreature(userId, date) {
  var isDemo = userId === DEMO_USER_ID;
  var cacheKey = userId + ":" + date;

  var cachedMetrics = metricsStore.get(cacheKey);
  if (cachedMetrics) {
    var fetchedAt = new Date(cachedMetrics.fetched_at).getTime();
    if (Date.now() - fetchedAt < 3600000) {
      var cachedCreature = latestCreatureStore.get(userId);
      if (cachedCreature && cachedCreature.date === date) {
        return {
          creature: cachedCreature,
          metrics: cachedMetrics,
          ascii_art: getAsciiArt(cachedCreature),
          status_message: getStatusMessage(cachedCreature),
          share_text: getShareText(cachedCreature, cachedMetrics),
          is_demo: isDemo,
        };
      }
    }
  }

  var whoopData;
  if (isDemo) {
    whoopData = generateDemoMetrics();
  } else {
    var user = users.get(userId);
    if (!user) throw new Error("User not found");
    whoopData = await fetchWhoopMetrics(user);
  }

  var metrics = {
    id: (cachedMetrics && cachedMetrics.id) || genId(),
    user_id: userId,
    date: date,
    recovery: whoopData.recovery,
    sleep_score: whoopData.sleep_score,
    strain: whoopData.strain,
    hrv: whoopData.hrv,
    rhr: whoopData.rhr,
    fetched_at: new Date().toISOString(),
  };
  metricsStore.set(cacheKey, metrics);

  var previous = latestCreatureStore.get(userId);
  var streak = 1;
  var hp = calculateHP(metrics, previous ? previous.health_points : 50);
  var isAlive = hp > 0;
  var mood = isAlive ? calculateMood(metrics) : "dead";
  var traits = calculateTraits(metrics, streak);

  var creature = {
    id: (previous && previous.id) || genId(),
    user_id: userId,
    date: date,
    name: (previous && previous.name) || "Whoopy",
    mood: mood,
    evolution_stage: calculateEvolution(streak),
    health_points: hp,
    streak_days: streak,
    is_alive: isAlive,
    traits: traits,
    created_at: (previous && previous.created_at) || new Date().toISOString(),
  };
  creaturesStore.set(cacheKey, creature);
  latestCreatureStore.set(userId, creature);

  return {
    creature: creature,
    metrics: metrics,
    ascii_art: getAsciiArt(creature),
    status_message: getStatusMessage(creature),
    share_text: getShareText(creature, metrics),
    is_demo: isDemo,
  };
}
