import { v4 as uuidv4 } from "uuid";
import type { User, DailyMetrics, CreatureState } from "../../shared/types.js";

// In-memory store — works on Vercel serverless (no native deps).
// Data is ephemeral per cold start; for persistence swap to a hosted DB.

const users = new Map<string, User>();
const usersByWhoop = new Map<string, User>();
const metrics = new Map<string, DailyMetrics>(); // key: `${userId}:${date}`
const creatures = new Map<string, CreatureState>(); // key: `${userId}:${date}`
const latestCreature = new Map<string, CreatureState>(); // key: userId

// --- Users ---

export function createUser(
  whoopUserId: string,
  accessToken: string,
  refreshToken: string,
  expiresAt: number,
  timezone: string = "UTC"
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
    timezone,
    created_at: new Date().toISOString(),
  };
  users.set(user.id, user);
  usersByWhoop.set(whoopUserId, user);
  return user;
}

export function getUserById(id: string): User | undefined {
  return users.get(id);
}

export function getUserByWhoopId(whoopUserId: string): User | undefined {
  return usersByWhoop.get(whoopUserId);
}

export function updateUserTokens(
  userId: string,
  accessToken: string,
  refreshToken: string,
  expiresAt: number
) {
  const user = users.get(userId);
  if (user) {
    user.access_token = accessToken;
    user.refresh_token = refreshToken;
    user.token_expires_at = expiresAt;
  }
}

export function getAllUsers(): User[] {
  return Array.from(users.values());
}

// --- Daily Metrics ---

export function upsertDailyMetrics(
  userId: string,
  date: string,
  recovery: number,
  sleepScore: number,
  strain: number,
  hrv: number = 0,
  rhr: number = 0
): DailyMetrics {
  const key = `${userId}:${date}`;
  const m: DailyMetrics = {
    id: metrics.get(key)?.id ?? uuidv4(),
    user_id: userId,
    date,
    recovery,
    sleep_score: sleepScore,
    strain,
    hrv,
    rhr,
    fetched_at: new Date().toISOString(),
  };
  metrics.set(key, m);
  return m;
}

export function getMetricsByDate(
  userId: string,
  date: string
): DailyMetrics | undefined {
  return metrics.get(`${userId}:${date}`);
}

export function getRecentMetrics(
  userId: string,
  days: number = 7
): DailyMetrics[] {
  const all: DailyMetrics[] = [];
  for (const m of metrics.values()) {
    if (m.user_id === userId) all.push(m);
  }
  return all.sort((a, b) => b.date.localeCompare(a.date)).slice(0, days);
}

// --- Creature States ---

export function upsertCreatureState(state: {
  user_id: string;
  date: string;
  name?: string;
  mood: string;
  evolution_stage: string;
  health_points: number;
  streak_days: number;
  is_alive: boolean;
  traits: string[];
}): CreatureState {
  const key = `${state.user_id}:${state.date}`;
  const creature: CreatureState = {
    id: creatures.get(key)?.id ?? uuidv4(),
    user_id: state.user_id,
    date: state.date,
    name: state.name || "BodyPet",
    mood: state.mood as CreatureState["mood"],
    evolution_stage: state.evolution_stage as CreatureState["evolution_stage"],
    health_points: state.health_points,
    streak_days: state.streak_days,
    is_alive: state.is_alive,
    traits: state.traits,
    created_at: creatures.get(key)?.created_at ?? new Date().toISOString(),
  };
  creatures.set(key, creature);
  latestCreature.set(state.user_id, creature);
  return creature;
}

export function getCreatureByDate(
  userId: string,
  date: string
): CreatureState | undefined {
  return creatures.get(`${userId}:${date}`);
}

export function getLatestCreature(
  userId: string
): CreatureState | undefined {
  return latestCreature.get(userId);
}

export function getStreakCount(userId: string): number {
  const all: CreatureState[] = [];
  for (const c of creatures.values()) {
    if (c.user_id === userId && c.is_alive) all.push(c);
  }
  if (all.length === 0) return 0;

  all.sort((a, b) => b.date.localeCompare(a.date));
  let streak = 1;
  for (let i = 1; i < all.length; i++) {
    const curr = new Date(all[i - 1].date);
    const prev = new Date(all[i].date);
    const diffDays =
      (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// --- Demo Mode ---

const DEMO_USER_ID = "demo-user-000";

export function ensureDemoUser(): User {
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

export function isDemoUser(userId: string): boolean {
  return userId === DEMO_USER_ID;
}
