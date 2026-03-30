export interface User {
  id: string;
  whoop_user_id: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: number;
  timezone: string;
  created_at: string;
}

export interface DailyMetrics {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  recovery: number; // 0-100
  sleep_score: number; // 0-100
  strain: number; // 0-21
  hrv: number;
  rhr: number;
  fetched_at: string;
}

export interface CreatureState {
  id: string;
  user_id: string;
  date: string;
  name: string;
  mood: CreatureMood;
  evolution_stage: EvolutionStage;
  health_points: number; // 0-100
  streak_days: number;
  is_alive: boolean;
  traits: string[]; // JSON array of active traits
  created_at: string;
}

export type CreatureMood =
  | "thriving"
  | "happy"
  | "neutral"
  | "tired"
  | "struggling"
  | "dead";

export type EvolutionStage =
  | "egg"
  | "baby"
  | "teen"
  | "adult"
  | "legendary";

export interface CreatureDisplay {
  creature: CreatureState;
  metrics: DailyMetrics | null;
  ascii_art: string;
  status_message: string;
  share_text: string;
}

export interface WhoopTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface WhoopRecovery {
  score: {
    recovery_score: number;
    resting_heart_rate: number;
    hrv_rmssd_milli: number;
  };
}

export interface WhoopSleep {
  score: {
    sleep_performance_percentage: number;
  };
}

export interface WhoopStrain {
  score: {
    strain: number;
  };
}
