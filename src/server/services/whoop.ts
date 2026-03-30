import type {
  WhoopTokenResponse,
  WhoopRecovery,
  WhoopSleep,
  WhoopStrain,
} from "../../shared/types.js";
import { updateUserTokens, getUserById } from "../db/store.js";

const WHOOP_API = "https://api.prod.whoop.com";
const WHOOP_AUTH = "https://api.prod.whoop.com/oauth/oauth2";

export function getAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: process.env.WHOOP_CLIENT_ID!,
    redirect_uri: process.env.WHOOP_REDIRECT_URI!,
    response_type: "code",
    scope: "read:recovery read:sleep read:workout read:profile read:cycles",
    state: Math.random().toString(36).substring(7),
  });
  return `${WHOOP_AUTH}/auth?${params}`;
}

export async function exchangeCode(
  code: string
): Promise<WhoopTokenResponse> {
  const res = await fetch(`${WHOOP_AUTH}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: process.env.WHOOP_CLIENT_ID!,
      client_secret: process.env.WHOOP_CLIENT_SECRET!,
      redirect_uri: process.env.WHOOP_REDIRECT_URI!,
    }),
  });
  if (!res.ok) {
    throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export async function refreshTokens(
  refreshToken: string
): Promise<WhoopTokenResponse> {
  const res = await fetch(`${WHOOP_AUTH}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.WHOOP_CLIENT_ID!,
      client_secret: process.env.WHOOP_CLIENT_SECRET!,
    }),
  });
  if (!res.ok) {
    throw new Error(`Token refresh failed: ${res.status}`);
  }
  return res.json();
}

async function getValidToken(userId: string): Promise<string> {
  const user = getUserById(userId);
  if (!user) throw new Error("User not found");

  if (Date.now() < user.token_expires_at - 60_000) {
    return user.access_token;
  }

  const tokens = await refreshTokens(user.refresh_token);
  updateUserTokens(
    userId,
    tokens.access_token,
    tokens.refresh_token,
    Date.now() + tokens.expires_in * 1000
  );
  return tokens.access_token;
}

async function whoopGet<T>(userId: string, path: string): Promise<T> {
  const token = await getValidToken(userId);
  const res = await fetch(`${WHOOP_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`WHOOP API error: ${res.status} ${path}`);
  }
  return res.json();
}

export async function getProfile(
  userId: string
): Promise<{ user_id: number; email: string }> {
  return whoopGet(userId, "/developer/v1/user/profile/basic");
}

export async function getLatestRecovery(
  userId: string
): Promise<WhoopRecovery | null> {
  const data = await whoopGet<{ records: WhoopRecovery[] }>(
    userId,
    "/developer/v1/recovery?limit=1"
  );
  return data.records?.[0] ?? null;
}

export async function getLatestSleep(
  userId: string
): Promise<WhoopSleep | null> {
  const data = await whoopGet<{ records: WhoopSleep[] }>(
    userId,
    "/developer/v1/activity/sleep?limit=1"
  );
  return data.records?.[0] ?? null;
}

export async function getLatestStrain(
  userId: string
): Promise<WhoopStrain | null> {
  const data = await whoopGet<{ records: WhoopStrain[] }>(
    userId,
    "/developer/v1/cycle?limit=1"
  );
  return data.records?.[0] ?? null;
}

export async function fetchAllMetrics(userId: string) {
  const [recovery, sleep, strain] = await Promise.all([
    getLatestRecovery(userId),
    getLatestSleep(userId),
    getLatestStrain(userId),
  ]);

  return {
    recovery: recovery?.score?.recovery_score ?? 50,
    sleep_score: sleep?.score?.sleep_performance_percentage ?? 50,
    strain: strain?.score?.strain ?? 10,
    hrv: recovery?.score?.hrv_rmssd_milli ?? 0,
    rhr: recovery?.score?.resting_heart_rate ?? 0,
  };
}
