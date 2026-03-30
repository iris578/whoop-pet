import { v4 as uuidv4 } from "uuid";
import { getDb } from "./schema.js";
import type { User, DailyMetrics, CreatureState } from "../../shared/types.js";

// --- Users ---

export function createUser(
  whoopUserId: string,
  accessToken: string,
  refreshToken: string,
  expiresAt: number,
  timezone: string = "UTC"
): User {
  const db = getDb();
  const id = uuidv4();
  db.prepare(
    `INSERT INTO users (id, whoop_user_id, access_token, refresh_token, token_expires_at, timezone)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(whoop_user_id) DO UPDATE SET
       access_token = excluded.access_token,
       refresh_token = excluded.refresh_token,
       token_expires_at = excluded.token_expires_at`
  ).run(id, whoopUserId, accessToken, refreshToken, expiresAt, timezone);

  return getUserByWhoopId(whoopUserId)!;
}

export function getUserById(id: string): User | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id) as
    | User
    | undefined;
}

export function getUserByWhoopId(whoopUserId: string): User | undefined {
  const db = getDb();
  return db
    .prepare("SELECT * FROM users WHERE whoop_user_id = ?")
    .get(whoopUserId) as User | undefined;
}

export function updateUserTokens(
  userId: string,
  accessToken: string,
  refreshToken: string,
  expiresAt: number
) {
  const db = getDb();
  db.prepare(
    `UPDATE users SET access_token = ?, refresh_token = ?, token_expires_at = ? WHERE id = ?`
  ).run(accessToken, refreshToken, expiresAt, userId);
}

export function getAllUsers(): User[] {
  const db = getDb();
  return db.prepare("SELECT * FROM users").all() as User[];
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
  const db = getDb();
  const id = uuidv4();
  db.prepare(
    `INSERT INTO daily_metrics (id, user_id, date, recovery, sleep_score, strain, hrv, rhr)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, date) DO UPDATE SET
       recovery = excluded.recovery,
       sleep_score = excluded.sleep_score,
       strain = excluded.strain,
       hrv = excluded.hrv,
       rhr = excluded.rhr,
       fetched_at = datetime('now')`
  ).run(id, userId, date, recovery, sleepScore, strain, hrv, rhr);

  return getMetricsByDate(userId, date)!;
}

export function getMetricsByDate(
  userId: string,
  date: string
): DailyMetrics | undefined {
  const db = getDb();
  return db
    .prepare("SELECT * FROM daily_metrics WHERE user_id = ? AND date = ?")
    .get(userId, date) as DailyMetrics | undefined;
}

export function getRecentMetrics(
  userId: string,
  days: number = 7
): DailyMetrics[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM daily_metrics WHERE user_id = ? ORDER BY date DESC LIMIT ?`
    )
    .all(userId, days) as DailyMetrics[];
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
  const db = getDb();
  const id = uuidv4();
  db.prepare(
    `INSERT INTO creature_states (id, user_id, date, name, mood, evolution_stage, health_points, streak_days, is_alive, traits)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, date) DO UPDATE SET
       mood = excluded.mood,
       evolution_stage = excluded.evolution_stage,
       health_points = excluded.health_points,
       streak_days = excluded.streak_days,
       is_alive = excluded.is_alive,
       traits = excluded.traits`
  ).run(
    id,
    state.user_id,
    state.date,
    state.name || "BodyPet",
    state.mood,
    state.evolution_stage,
    state.health_points,
    state.streak_days,
    state.is_alive ? 1 : 0,
    JSON.stringify(state.traits)
  );

  return getCreatureByDate(state.user_id, state.date)!;
}

export function getCreatureByDate(
  userId: string,
  date: string
): CreatureState | undefined {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM creature_states WHERE user_id = ? AND date = ?")
    .get(userId, date) as any;
  if (!row) return undefined;
  return {
    ...row,
    is_alive: !!row.is_alive,
    traits: JSON.parse(row.traits),
  };
}

export function getLatestCreature(
  userId: string
): CreatureState | undefined {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT * FROM creature_states WHERE user_id = ? ORDER BY date DESC LIMIT 1"
    )
    .get(userId) as any;
  if (!row) return undefined;
  return {
    ...row,
    is_alive: !!row.is_alive,
    traits: JSON.parse(row.traits),
  };
}

export function getStreakCount(userId: string): number {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT date FROM creature_states WHERE user_id = ? AND is_alive = 1 ORDER BY date DESC LIMIT 365"
    )
    .all(userId) as { date: string }[];

  if (rows.length === 0) return 0;

  let streak = 1;
  for (let i = 1; i < rows.length; i++) {
    const curr = new Date(rows[i - 1].date);
    const prev = new Date(rows[i].date);
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
