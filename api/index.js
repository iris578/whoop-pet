var { neon } = require("@neondatabase/serverless");

function getDb() {
  return neon(process.env.DATABASE_URL);
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  var url = req.url || "";
  var cookies = parseCookies(req.headers.cookie);

  try {
    // Health check
    if (url === "/api" || url === "/api/" || url.startsWith("/api/health")) {
      return res.json({ status: "ok", timestamp: new Date().toISOString() });
    }

    // Resolve user
    var sql = getDb();
    var userId = cookies.bodypet_user;
    var isDemo = true;
    var user = null;

    if (userId) {
      var rows = await sql`SELECT * FROM users WHERE id = ${userId}`;
      if (rows.length > 0) {
        user = rows[0];
        isDemo = false;
      }
    }

    var today = new Date().toISOString().split("T")[0];

    // Debug
    if (url.startsWith("/api/debug")) {
      if (!isDemo && user) {
        var debugData = await fetchWhoopMetrics(user, sql);
        return res.json({ userId: userId, raw: debugData });
      }
      return res.json({ userId: userId || "none", message: "demo mode" });
    }

    // Creature refresh / get
    if (url.startsWith("/api/creature/refresh") || url.startsWith("/api/creature")) {
      var display = await updateCreature(sql, userId, user, isDemo, today);
      return res.json(display);
    }

    // Rename
    if (url.startsWith("/api/creature/name") && req.method === "POST") {
      var body = req.body || {};
      if (!body.name || typeof body.name !== "string" || body.name.length > 20) {
        return res.status(400).json({ error: "Name must be 1-20 characters" });
      }
      if (!isDemo) {
        await sql`UPDATE creature_states SET name = ${body.name} WHERE user_id = ${userId}`;
      }
      return res.json({ name: body.name });
    }

    // Me
    if (url.startsWith("/api/me")) {
      var creature = null;
      if (!isDemo) {
        var crows = await sql`SELECT * FROM creature_states WHERE user_id = ${userId} ORDER BY date DESC LIMIT 1`;
        creature = crows[0] || null;
      }
      return res.json({
        user_id: userId,
        is_demo: isDemo,
        has_creature: !!creature,
        creature_name: creature ? creature.name : null,
        whoop_connected: !isDemo,
      });
    }

    // History
    if (url.startsWith("/api/history")) {
      if (!isDemo) {
        var mrows = await sql`SELECT * FROM daily_metrics WHERE user_id = ${userId} ORDER BY date DESC LIMIT 7`;
        return res.json({ metrics: mrows });
      }
      return res.json({ metrics: [] });
    }

    return res.status(404).json({ error: "Not found", url: url });
  } catch (err) {
    console.error("Handler error:", err);
    return res.status(500).json({ error: "Internal server error", message: String(err) });
  }
};

// ============================================================
// Helpers
// ============================================================

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
async function fetchWhoopMetrics(user, sql) {
  var accessToken = user.access_token;

  // Refresh token if expired
  if (Date.now() >= Number(user.token_expires_at) - 60000) {
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
        accessToken = tokens.access_token;
        var newExp = Date.now() + tokens.expires_in * 1000;
        await sql`UPDATE users SET access_token = ${tokens.access_token}, refresh_token = ${tokens.refresh_token}, token_expires_at = ${newExp} WHERE id = ${user.id}`;
      }
    } catch (e) { /* use existing token */ }
  }

  var headers = { Authorization: "Bearer " + accessToken };
  var BASE = "https://api.prod.whoop.com/developer";
  var endpoints = {
    cycle: BASE + "/v1/cycle?limit=1",
    recovery_v2: BASE + "/v2/recovery?limit=1",
    recovery_v1: BASE + "/v1/recovery?limit=1",
    sleep_v2: BASE + "/v2/activity/sleep?limit=1",
    sleep_v1: BASE + "/v1/activity/sleep?limit=1",
  };

  var responses = {};
  await Promise.all(
    Object.entries(endpoints).map(function (entry) {
      return fetch(entry[1], { headers: headers })
        .then(async function (r) {
          var body = null;
          try { var text = await r.text(); body = JSON.parse(text); } catch (e) { body = text; }
          responses[entry[0]] = { status: r.status, ok: r.ok, body: body };
        })
        .catch(function (err) {
          responses[entry[0]] = { status: 0, ok: false, error: String(err) };
        });
    })
  );

  var recovery = null, sleepScore = null, strain = null, hrv = null, rhr = null;

  function firstRecord(resp) {
    if (!resp || !resp.ok || !resp.body) return null;
    var b = resp.body;
    var arr = b.records || b.data || (Array.isArray(b) ? b : null);
    if (arr && arr[0]) return arr[0];
    if (typeof b === "object" && b.score) return b;
    return null;
  }

  var recKeys = ["recovery_v2", "recovery_v1"];
  for (var ri = 0; ri < recKeys.length; ri++) {
    var rec = firstRecord(responses[recKeys[ri]]);
    if (rec && rec.score) {
      recovery = rec.score.recovery_score;
      hrv = rec.score.hrv_rmssd_milli;
      rhr = rec.score.resting_heart_rate;
      break;
    }
  }

  var sleepKeys = ["sleep_v2", "sleep_v1"];
  for (var si = 0; si < sleepKeys.length; si++) {
    var sleepRec = firstRecord(responses[sleepKeys[si]]);
    if (sleepRec && sleepRec.score) {
      sleepScore = sleepRec.score.sleep_performance_percentage;
      break;
    }
  }

  var cycleBody = responses.cycle && responses.cycle.ok && responses.cycle.body;
  if (cycleBody) {
    var cycleRec = cycleBody.records && cycleBody.records[0];
    if (cycleRec && cycleRec.score) strain = cycleRec.score.strain;
    if (recovery == null && cycleRec && cycleRec.recovery && cycleRec.recovery.score) {
      recovery = cycleRec.recovery.score.recovery_score;
      hrv = cycleRec.recovery.score.hrv_rmssd_milli;
      rhr = cycleRec.recovery.score.resting_heart_rate;
    }
  }

  return {
    recovery: recovery != null ? recovery : 50,
    sleep_score: sleepScore != null ? sleepScore : 50,
    strain: strain != null ? strain : 10,
    hrv: hrv != null ? hrv : 0,
    rhr: rhr != null ? rhr : 0,
    _raw: responses,
  };
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
  var strainBonus = metrics.strain > 5 ? (metrics.strain - 5) * 1.0 : 0;
  var sleepDelta = (metrics.sleep_score - 60) * 0.6;
  var recoveryDelta = (metrics.recovery - 50) * 0.6;
  var delta = strainBonus + sleepDelta + recoveryDelta;
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

// --- Core: update creature (with DB persistence) ---
async function updateCreature(sql, userId, user, isDemo, date) {
  // Check cached metrics in DB
  var cachedRows = [];
  if (!isDemo) {
    cachedRows = await sql`SELECT * FROM daily_metrics WHERE user_id = ${userId} AND date = ${date}`;
  }
  var cachedMetrics = cachedRows[0] || null;

  // Check if cache is fresh (< 1 hour)
  if (cachedMetrics) {
    var fetchedAt = new Date(cachedMetrics.fetched_at).getTime();
    if (Date.now() - fetchedAt < 3600000) {
      var creatureRows = await sql`SELECT * FROM creature_states WHERE user_id = ${userId} AND date = ${date}`;
      if (creatureRows[0]) {
        var c = creatureRows[0];
        c.traits = typeof c.traits === "string" ? JSON.parse(c.traits) : (c.traits || []);
        return {
          creature: c,
          metrics: cachedMetrics,
          status_message: getStatusMessage(c),
          share_text: getShareText(c, cachedMetrics),
          is_demo: false,
        };
      }
    }
  }

  // Fetch fresh data
  var whoopData;
  if (isDemo) {
    whoopData = generateDemoMetrics();
  } else {
    whoopData = await fetchWhoopMetrics(user, sql);
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
  };

  // Save metrics to DB
  if (!isDemo) {
    await sql`
      INSERT INTO daily_metrics (id, user_id, date, recovery, sleep_score, strain, hrv, rhr)
      VALUES (${metrics.id}, ${userId}, ${date}, ${metrics.recovery}, ${metrics.sleep_score}, ${metrics.strain}, ${metrics.hrv}, ${metrics.rhr})
      ON CONFLICT (user_id, date) DO UPDATE SET
        recovery = ${metrics.recovery}, sleep_score = ${metrics.sleep_score}, strain = ${metrics.strain},
        hrv = ${metrics.hrv}, rhr = ${metrics.rhr}, fetched_at = NOW()`;
  }

  // Get previous creature state
  var prevRows = [];
  if (!isDemo) {
    prevRows = await sql`SELECT * FROM creature_states WHERE user_id = ${userId} ORDER BY date DESC LIMIT 1`;
  }
  var previous = prevRows[0] || null;

  // Calculate streak
  var streak = 1;
  if (!isDemo) {
    var streakRows = await sql`SELECT date FROM creature_states WHERE user_id = ${userId} AND is_alive = true ORDER BY date DESC LIMIT 365`;
    streak = calcStreak(streakRows, date);
  }

  var hp = calculateHP(metrics, previous ? Number(previous.health_points) : 50);
  var isAlive = hp > 0;
  var mood = isAlive ? calculateMood(metrics) : "dead";
  var traits = calculateTraits(metrics, streak);

  var creature = {
    id: (previous && previous.date === date && previous.id) || genId(),
    user_id: userId,
    date: date,
    name: (previous && previous.name) || "Whoopy",
    mood: mood,
    evolution_stage: calculateEvolution(streak),
    health_points: hp,
    streak_days: streak,
    is_alive: isAlive,
    traits: traits,
  };

  // Save creature to DB
  if (!isDemo) {
    await sql`
      INSERT INTO creature_states (id, user_id, date, name, mood, evolution_stage, health_points, streak_days, is_alive, traits)
      VALUES (${creature.id}, ${userId}, ${date}, ${creature.name}, ${creature.mood}, ${creature.evolution_stage}, ${creature.health_points}, ${creature.streak_days}, ${creature.is_alive}, ${JSON.stringify(creature.traits)})
      ON CONFLICT (user_id, date) DO UPDATE SET
        mood = ${creature.mood}, evolution_stage = ${creature.evolution_stage},
        health_points = ${creature.health_points}, streak_days = ${creature.streak_days},
        is_alive = ${creature.is_alive}, traits = ${JSON.stringify(creature.traits)}`;
  }

  metrics.fetched_at = new Date().toISOString();

  return {
    creature: creature,
    metrics: metrics,
    status_message: getStatusMessage(creature),
    share_text: getShareText(creature, metrics),
    is_demo: isDemo,
  };
}

function calcStreak(rows, todayDate) {
  if (!rows || rows.length === 0) return 1;
  // Include today
  var dates = rows.map(function (r) { return r.date; });
  if (dates.indexOf(todayDate) === -1) dates.unshift(todayDate);
  dates.sort(function (a, b) { return b.localeCompare(a); });

  var streak = 1;
  for (var i = 1; i < dates.length; i++) {
    var curr = new Date(dates[i - 1]);
    var prev = new Date(dates[i]);
    var diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    if (Math.round(diff) === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}
