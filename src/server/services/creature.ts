import type {
  DailyMetrics,
  CreatureState,
  CreatureMood,
  EvolutionStage,
  CreatureDisplay,
} from "../../shared/types.js";
import {
  upsertCreatureState,
  getLatestCreature,
  getStreakCount,
  upsertDailyMetrics,
  getMetricsByDate,
  isDemoUser,
} from "../db/store.js";
import { fetchAllMetrics } from "./whoop.js";

function calculateMood(metrics: DailyMetrics): CreatureMood {
  const avg = (metrics.recovery + metrics.sleep_score) / 2;
  if (avg >= 80) return "thriving";
  if (avg >= 60) return "happy";
  if (avg >= 40) return "neutral";
  if (avg >= 20) return "tired";
  return "struggling";
}

function calculateHP(metrics: DailyMetrics, previousHP: number): number {
  const recoveryFactor = (metrics.recovery - 50) / 50; // -1 to 1
  const sleepFactor = (metrics.sleep_score - 50) / 50;
  const strainPenalty = metrics.strain > 18 ? -10 : metrics.strain > 15 ? -5 : 0;

  const delta =
    recoveryFactor * 15 + sleepFactor * 15 + strainPenalty;

  return Math.max(0, Math.min(100, previousHP + delta));
}

function calculateEvolution(streakDays: number): EvolutionStage {
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

function generateDemoMetrics(): {
  recovery: number;
  sleep_score: number;
  strain: number;
  hrv: number;
  rhr: number;
} {
  // Seeded from the day so the demo creature is consistent within a day
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

export async function updateCreature(
  userId: string,
  date: string
): Promise<CreatureDisplay> {
  // Check cache first
  let metrics = getMetricsByDate(userId, date);
  if (metrics) {
    const fetchedAt = new Date(metrics.fetched_at).getTime();
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    if (fetchedAt > oneHourAgo) {
      const creature = getLatestCreature(userId);
      if (creature && creature.date === date) {
        return buildDisplay(creature, metrics);
      }
    }
  }

  // Fetch data — demo mode uses generated metrics, real mode hits WHOOP
  let whoopData: {
    recovery: number;
    sleep_score: number;
    strain: number;
    hrv: number;
    rhr: number;
  };

  if (isDemoUser(userId)) {
    whoopData = generateDemoMetrics();
  } else {
    whoopData = await fetchAllMetrics(userId);
  }

  metrics = upsertDailyMetrics(
    userId,
    date,
    whoopData.recovery,
    whoopData.sleep_score,
    whoopData.strain,
    whoopData.hrv,
    whoopData.rhr
  );

  // Calculate creature state
  const previous = getLatestCreature(userId);
  const streak = getStreakCount(userId) + 1;
  const hp = calculateHP(metrics, previous?.health_points ?? 50);
  const isAlive = hp > 0;

  const creature = upsertCreatureState({
    user_id: userId,
    date,
    name: previous?.name ?? "BodyPet",
    mood: isAlive ? calculateMood(metrics) : "dead",
    evolution_stage: calculateEvolution(streak),
    health_points: hp,
    streak_days: streak,
    is_alive: isAlive,
    traits: calculateTraits(metrics, streak),
  });

  return buildDisplay(creature, metrics);
}

function buildDisplay(
  creature: CreatureState,
  metrics: DailyMetrics
): CreatureDisplay {
  return {
    creature,
    metrics,
    ascii_art: getAsciiArt(creature),
    status_message: getStatusMessage(creature),
    share_text: getShareText(creature, metrics),
  };
}

function getAsciiArt(creature: CreatureState): string {
  if (!creature.is_alive) {
    return `
    ╔═══════════════╗
    ║   ✖  ✖       ║
    ║    ───        ║
    ║  R.I.P.       ║
    ║  ${creature.name.padEnd(11)}  ║
    ╚═══════════════╝`;
  }

  const faces: Record<EvolutionStage, Record<CreatureMood, string>> = {
    egg: {
      thriving: "    🥚✨\n   (^‿^)\n  Ready to\n   hatch!",
      happy: "    🥚\n   (^‿^)\n  Warming\n    up!",
      neutral: "    🥚\n   (•_•)\n  Sitting\n   here...",
      tired: "    🥚\n   (-_-)\n   Cold...",
      struggling: "    🥚💔\n   (;_;)\n  Cracking\n   apart...",
      dead: "",
    },
    baby: {
      thriving: "   ∩∩\n  (★‿★)  ✨\n  /|  |\\\n   d  b\n  So strong!",
      happy: "   ∩∩\n  (^‿^)\n  /|  |\\\n   d  b\n  Growing!",
      neutral: "   ∩∩\n  (•_•)\n  /|  |\\\n   d  b\n  Hanging in",
      tired: "   ∩∩\n  (-_-) zzZ\n  /|  |\\\n   d  b\n  Sleepy...",
      struggling: "   ∩∩\n  (T_T)\n  /|  |\\\n   d  b\n  Help me...",
      dead: "",
    },
    teen: {
      thriving: "   ∩∩∩\n  (★‿★)  ⚡\n  /|██|\\\n  / ‖‖ \\\n  On fire!",
      happy: "   ∩∩∩\n  (^‿^)\n  /|██|\\\n  / ‖‖ \\\n  Feeling good",
      neutral: "   ∩∩∩\n  (•_•)\n  /|██|\\\n  / ‖‖ \\\n  Meh...",
      tired: "   ∩∩∩\n  (-_-)zzZ\n  /|██|\\\n  / ‖‖ \\\n  Need rest",
      struggling: "   ∩∩∩\n  (×_×)\n  /|██|\\\n  / ‖‖ \\\n  Barely alive",
      dead: "",
    },
    adult: {
      thriving: "  ╔∩∩∩╗\n  ║★‿★║ 🔥\n  ╠████╣\n  ║ ‖‖ ║\n  ╚╧══╧╝\n  UNSTOPPABLE",
      happy: "  ╔∩∩∩╗\n  ║^‿^║\n  ╠████╣\n  ║ ‖‖ ║\n  ╚╧══╧╝\n  Strong!",
      neutral: "  ╔∩∩∩╗\n  ║•_•║\n  ╠████╣\n  ║ ‖‖ ║\n  ╚╧══╧╝\n  Steady",
      tired: "  ╔∩∩∩╗\n  ║-_-║ zzZ\n  ╠████╣\n  ║ ‖‖ ║\n  ╚╧══╧╝\n  Drained",
      struggling: "  ╔∩∩∩╗\n  ║×_×║ 💔\n  ╠████╣\n  ║ ‖‖ ║\n  ╚╧══╧╝\n  Fading...",
      dead: "",
    },
    legendary: {
      thriving: "  👑\n  ╔∩∩∩╗ ✨⚡🔥\n  ║★‿★║\n  ╠████╣\n  ║ ‖‖ ║\n  ╚╧══╧╝\n  ★ LEGENDARY ★",
      happy: "  👑\n  ╔∩∩∩╗ ✨\n  ║^‿^║\n  ╠████╣\n  ║ ‖‖ ║\n  ╚╧══╧╝\n  ★ LEGENDARY ★",
      neutral: "  👑\n  ╔∩∩∩╗\n  ║•_•║\n  ╠████╣\n  ║ ‖‖ ║\n  ╚╧══╧╝\n  Legendary",
      tired: "  👑\n  ╔∩∩∩╗ zzZ\n  ║-_-║\n  ╠████╣\n  ║ ‖‖ ║\n  ╚╧══╧╝\n  Even legends rest",
      struggling: "  👑\n  ╔∩∩∩╗ 💔\n  ║×_×║\n  ╠████╣\n  ║ ‖‖ ║\n  ╚╧══╧╝\n  Legend down...",
      dead: "",
    },
  };

  return faces[creature.evolution_stage]?.[creature.mood] ?? "(•_•)";
}

function getStatusMessage(creature: CreatureState): string {
  if (!creature.is_alive) {
    return `${creature.name} has perished... Start a new streak to resurrect!`;
  }

  const messages: Record<CreatureMood, string[]> = {
    thriving: [
      "Your body is a machine today!",
      "Peak performance unlocked!",
      "Nothing can stop you!",
    ],
    happy: [
      "Looking good! Keep it up!",
      "Your creature is vibing!",
      "Solid day ahead!",
    ],
    neutral: [
      "An average day. Nothing wrong with that.",
      "Steady as she goes.",
      "Room for improvement, but you're here.",
    ],
    tired: [
      "Your body needs rest...",
      "Maybe take it easy today?",
      "Recovery mode activated.",
    ],
    struggling: [
      "Your creature is barely hanging on!",
      "Emergency! Get some sleep!",
      "Code red: body in crisis!",
    ],
    dead: [""],
  };

  const pool = messages[creature.mood];
  return pool[Math.floor(Math.random() * pool.length)];
}

function getShareText(
  creature: CreatureState,
  metrics: DailyMetrics
): string {
  const status = creature.is_alive
    ? `${creature.mood.toUpperCase()}`
    : "DEAD 💀";
  return [
    `🐾 My BodyPet is ${status}!`,
    `❤️ HP: ${Math.round(creature.health_points)}/100`,
    `🔥 Streak: ${creature.streak_days} days`,
    `📊 Recovery: ${Math.round(metrics.recovery)}% | Sleep: ${Math.round(metrics.sleep_score)}% | Strain: ${metrics.strain.toFixed(1)}`,
    `🧬 Stage: ${creature.evolution_stage}`,
    creature.traits.length > 0
      ? `✨ Traits: ${creature.traits.join(", ")}`
      : "",
    "",
    "Get your own BodyPet! 🐣",
  ]
    .filter(Boolean)
    .join("\n");
}
