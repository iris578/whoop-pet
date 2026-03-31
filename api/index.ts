import type { VercelRequest, VercelResponse } from "@vercel/node";

function uuidv4(): string {
  let d = Date.now();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ============================================================
// Inline everything to avoid import resolution issues on Vercel
// ============================================================

// --- Types ---
interface DailyMetrics {
  id: string;
  user_id: string;
  date: string;
  recovery: number;
  sleep_score: number;
  strain: number;
  hrv: number;
  rhr: number;
  fetched_at: string;
}

interface CreatureState {
  id: string;
  user_id: string;
  date: string;
  name: string;
  mood: string;
  evolution_stage: string;
  health_points: number;
  streak_days: number;
  is_alive: boolean;
  traits: string[];
  created_at: string;
}

interface User {
  id: string;
  whoop_user_id: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: number;
  timezone: string;
  created_at: string;
}

// --- In-memory store ---
const users = new Map<string, User>();
const usersByWhoop = new Map<string, User>();
const metricsStore = new Map<string, DailyMetrics>();
const creaturesStore = new Map<string, CreatureState>();
const latestCreatureStore = new Map<string, CreatureState>();

const DEMO_USER_ID = "demo-user-000";

function ensureDemoUser(): User {
  let user = users.get(DEMO_USER_ID);
  if (!user) {
    user = {
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
  return user;
}

function createUser(
  whoopUserId: string,
  accessToken: string,
  refreshToken: string,
  expiresAt: number
): User {
  const existing = usersByWhoop.get(whoopUserId);
  if (existing) {
    existing.access_token = accessToken;
    existing.refresh_token = refreshToken;
    existing.token_expires_at = expiresAt;
    return existing;
  }
  const user: User = {
    id: uuidv4(),
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

// --- Cookie parsing ---
function parseCookies(header: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;
  for (const cookie of header.split(";")) {
    const [name, ...rest] = cookie.trim().split("=");
    if (name) cookies[name] = rest.join("=");
  }
  return cookies;
}

// --- Demo metrics generator ---
function generateDemoMetrics() {
  const daySeed = new Date().toISOString().split("T")[0];
  let hash = 0;
  for (let i = 0; i < daySeed.length; i++) {
    hash = (hash * 31 + daySeed.charCodeAt(i)) | 0;
  }
  const rand = (min: number, max: number) => {
    hash = (hash * 16807 + 7) | 0;
    return min + Math.abs(hash % (max - min + 1));
  };
  return {
    recovery: rand(40, 95),
    sleep_score: rand(50, 98),
    strain: parseFloat((rand(5, 18) + rand(0, 9) / 10).toFixed(1)),
    hrv: rand(30, 120),
    rhr: rand(48, 72),
  };
}

// --- Creature engine ---
function calculateMood(metrics: DailyMetrics): string {
  const avg = (metrics.recovery + metrics.sleep_score) / 2;
  if (avg >= 80) return "thriving";
  if (avg >= 60) return "happy";
  if (avg >= 40) return "neutral";
  if (avg >= 20) return "tired";
  return "struggling";
}

function calculateHP(metrics: DailyMetrics, previousHP: number): number {
  const recoveryFactor = (metrics.recovery - 50) / 50;
  const sleepFactor = (metrics.sleep_score - 50) / 50;
  const strainPenalty = metrics.strain > 18 ? -10 : metrics.strain > 15 ? -5 : 0;
  const delta = recoveryFactor * 15 + sleepFactor * 15 + strainPenalty;
  return Math.max(0, Math.min(100, previousHP + delta));
}

function calculateEvolution(streakDays: number): string {
  if (streakDays >= 60) return "legendary";
  if (streakDays >= 30) return "adult";
  if (streakDays >= 14) return "teen";
  if (streakDays >= 3) return "baby";
  return "egg";
}

function calculateTraits(metrics: DailyMetrics, streak: number): string[] {
  const traits: string[] = [];
  if (metrics.recovery >= 90) traits.push("supercharged");
  if (metrics.sleep_score >= 90) traits.push("well-rested");
  if (metrics.strain >= 18) traits.push("beast-mode");
  if (streak >= 7) traits.push("consistent");
  if (streak >= 30) traits.push("iron-will");
  if (metrics.recovery <= 20) traits.push("exhausted");
  if (metrics.sleep_score <= 20) traits.push("sleep-deprived");
  return traits;
}

function getAsciiArt(creature: CreatureState): string {
  if (!creature.is_alive) {
    return [
      "    ╔═══════════════╗",
      "    ║   ✖  ✖       ║",
      "    ║    ───        ║",
      "    ║  R.I.P.       ║",
      `    ║  ${creature.name.padEnd(11)}  ║`,
      "    ╚═══════════════╝",
    ].join("\n");
  }
  const faces: Record<string, Record<string, string>> = {
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
  return faces[creature.evolution_stage]?.[creature.mood] ?? "(•_•)";
}

function getStatusMessage(creature: CreatureState): string {
  if (!creature.is_alive) {
    return `${creature.name} has perished... Start a new streak to resurrect!`;
  }
  const messages: Record<string, string[]> = {
    thriving: ["Your body is a machine today!", "Peak performance unlocked!", "Nothing can stop you!"],
    happy: ["Looking good! Keep it up!", "Your creature is vibing!", "Solid day ahead!"],
    neutral: ["An average day. Nothing wrong with that.", "Steady as she goes.", "Room for improvement, but you're here."],
    tired: ["Your body needs rest...", "Maybe take it easy today?", "Recovery mode activated."],
    struggling: ["Your creature is barely hanging on!", "Emergency! Get some sleep!", "Code red: body in crisis!"],
  };
  const pool = messages[creature.mood] || ["Keep going!"];
  return pool[Math.floor(Math.random() * pool.length)];
}

function getShareText(creature: CreatureState, metrics: DailyMetrics): string {
  const status = creature.is_alive ? creature.mood.toUpperCase() : "DEAD 💀";
  return [
    `🐾 My BodyPet is ${status}!`,
    `❤️ HP: ${Math.round(creature.health_points)}/100`,
    `🔥 Streak: ${creature.streak_days} days`,
    `📊 Recovery: ${Math.round(metrics.recovery)}% | Sleep: ${Math.round(metrics.sleep_score)}% | Strain: ${metrics.strain.toFixed(1)}`,
    `🧬 Stage: ${creature.evolution_stage}`,
    creature.traits.length > 0 ? `✨ Traits: ${creature.traits.join(", ")}` : "",
    "",
    "Get your own BodyPet! 🐣",
  ].filter(Boolean).join("\n");
}

// --- WHOOP API ---
async function fetchWhoopMetrics(user: User) {
  const token = user.access_token;

  // If token expired, try refresh
  let accessToken = token;
  if (Date.now() >= user.token_expires_at - 60_000) {
    try {
      const refreshRes = await fetch("https://api.prod.whoop.com/oauth/oauth2/token", {
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
        const tokens = await refreshRes.json();
        user.access_token = tokens.access_token;
        user.refresh_token = tokens.refresh_token;
        user.token_expires_at = Date.now() + tokens.expires_in * 1000;
        accessToken = tokens.access_token;
      }
    } catch {
      // If refresh fails, try with existing token
    }
  }

  const headers = { Authorization: `Bearer ${accessToken}` };

  const [recoveryRes, sleepRes, cycleRes] = await Promise.all([
    fetch("https://api.prod.whoop.com/developer/v1/recovery?limit=1", { headers }).catch(() => null),
    fetch("https://api.prod.whoop.com/developer/v1/activity/sleep?limit=1", { headers }).catch(() => null),
    fetch("https://api.prod.whoop.com/developer/v1/cycle?limit=1", { headers }).catch(() => null),
  ]);

  let recovery = 50, sleepScore = 50, strain = 10, hrv = 0, rhr = 0;

  try {
    if (recoveryRes?.ok) {
      const data = await recoveryRes.json();
      const rec = data.records?.[0];
      if (rec?.score) {
        recovery = rec.score.recovery_score ?? 50;
        hrv = rec.score.hrv_rmssd_milli ?? 0;
        rhr = rec.score.resting_heart_rate ?? 0;
      }
    }
  } catch {}

  try {
    if (sleepRes?.ok) {
      const data = await sleepRes.json();
      sleepScore = data.records?.[0]?.score?.sleep_performance_percentage ?? 50;
    }
  } catch {}

  try {
    if (cycleRes?.ok) {
      const data = await cycleRes.json();
      strain = data.records?.[0]?.score?.strain ?? 10;
    }
  } catch {}

  return { recovery, sleep_score: sleepScore, strain, hrv, rhr };
}

// --- Core: update creature ---
async function updateCreature(userId: string, date: string) {
  const isDemo = userId === DEMO_USER_ID;

  // Check cache
  const cacheKey = `${userId}:${date}`;
  const cachedMetrics = metricsStore.get(cacheKey);
  if (cachedMetrics) {
    const fetchedAt = new Date(cachedMetrics.fetched_at).getTime();
    if (Date.now() - fetchedAt < 3600_000) {
      const cachedCreature = latestCreatureStore.get(userId);
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

  // Fetch metrics
  let whoopData;
  if (isDemo) {
    whoopData = generateDemoMetrics();
  } else {
    const user = users.get(userId);
    if (!user) throw new Error("User not found");
    whoopData = await fetchWhoopMetrics(user);
  }

  // Store metrics
  const metrics: DailyMetrics = {
    id: cachedMetrics?.id ?? uuidv4(),
    user_id: userId,
    date,
    recovery: whoopData.recovery,
    sleep_score: whoopData.sleep_score,
    strain: whoopData.strain,
    hrv: whoopData.hrv,
    rhr: whoopData.rhr,
    fetched_at: new Date().toISOString(),
  };
  metricsStore.set(cacheKey, metrics);

  // Calculate creature
  const previous = latestCreatureStore.get(userId);
  const streak = 1; // Simplified for serverless (no persistent history)
  const hp = calculateHP(metrics, previous?.health_points ?? 50);
  const isAlive = hp > 0;
  const mood = isAlive ? calculateMood(metrics) : "dead";
  const traits = calculateTraits(metrics, streak);

  const creature: CreatureState = {
    id: previous?.id ?? uuidv4(),
    user_id: userId,
    date,
    name: previous?.name ?? "BodyPet",
    mood,
    evolution_stage: calculateEvolution(streak),
    health_points: hp,
    streak_days: streak,
    is_alive: isAlive,
    traits,
    created_at: previous?.created_at ?? new Date().toISOString(),
  };
  creaturesStore.set(cacheKey, creature);
  latestCreatureStore.set(userId, creature);

  return {
    creature,
    metrics,
    ascii_art: getAsciiArt(creature),
    status_message: getStatusMessage(creature),
    share_text: getShareText(creature, metrics),
    is_demo: isDemo,
  };
}

// ============================================================
// Vercel handler
// ============================================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const url = req.url || "";
  const cookies = parseCookies(req.headers.cookie);

  try {
    // --- AUTH routes ---
    if (url.startsWith("/auth/whoop/callback")) {
      const code = req.query.code as string;
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
        { headers: { Authorization: `Bearer ${tokens.access_token}` } }
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
        `bodypet_user=${user.id}; Path=/; HttpOnly; Max-Age=31536000; SameSite=Lax`
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
      return res.redirect(302, `https://api.prod.whoop.com/oauth/oauth2/auth?${params}`);
    }

    if (url.startsWith("/auth/status")) {
      return res.json({ whoop_configured: !!process.env.WHOOP_CLIENT_ID });
    }

    // --- API routes ---

    // Resolve user: cookie -> real user, or fallback to demo
    let userId: string;
    let isDemo: boolean;
    const cookieUserId = cookies.bodypet_user;
    if (cookieUserId && users.has(cookieUserId)) {
      userId = cookieUserId;
      isDemo = false;
    } else {
      ensureDemoUser();
      userId = DEMO_USER_ID;
      isDemo = true;
    }

    const today = new Date().toISOString().split("T")[0];

    if (url.startsWith("/api/creature/refresh")) {
      const display = await updateCreature(userId, today);
      return res.json(display);
    }

    if (url.startsWith("/api/creature/name") && req.method === "POST") {
      const { name } = req.body || {};
      if (!name || typeof name !== "string" || name.length > 20) {
        return res.status(400).json({ error: "Name must be 1-20 characters" });
      }
      const creature = latestCreatureStore.get(userId);
      if (creature) {
        creature.name = name;
      }
      return res.json({ name });
    }

    if (url.startsWith("/api/creature")) {
      const display = await updateCreature(userId, today);
      return res.json(display);
    }

    if (url.startsWith("/api/me")) {
      const creature = latestCreatureStore.get(userId);
      return res.json({
        user_id: userId,
        is_demo: isDemo,
        has_creature: !!creature,
        creature_name: creature?.name ?? null,
        whoop_connected: !isDemo,
      });
    }

    if (url.startsWith("/api/history")) {
      const all: DailyMetrics[] = [];
      for (const m of metricsStore.values()) {
        if (m.user_id === userId) all.push(m);
      }
      return res.json({ metrics: all.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7) });
    }

    return res.status(404).json({ error: "Not found" });
  } catch (err) {
    console.error("Handler error:", err);
    return res.status(500).json({
      error: "Internal server error",
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
