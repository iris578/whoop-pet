import React, { useState } from "react";
import type { CreatureDisplay } from "../../shared/types.js";
import { PixelDog } from "./PixelDog.js";
import { TamagotchiShell } from "./TamagotchiShell.js";

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "20px",
    maxWidth: "480px",
    width: "100%",
  },
  creatureBox: {
    background: "rgba(255,255,255,0.05)",
    border: "2px solid rgba(255,255,255,0.1)",
    borderRadius: "16px",
    padding: "30px",
    textAlign: "center" as const,
    width: "100%",
    animation: "float 4s ease-in-out infinite",
  },
  asciiArt: {
    whiteSpace: "pre" as const,
    fontSize: "1.1rem",
    lineHeight: "1.4",
    marginBottom: "16px",
  },
  name: {
    fontSize: "1.4rem",
    fontWeight: "bold",
    color: "#ffd93d",
  },
  mood: {
    fontSize: "0.9rem",
    textTransform: "uppercase" as const,
    letterSpacing: "2px",
    marginTop: "4px",
  },
  statusMessage: {
    fontStyle: "italic",
    color: "#aaa",
    fontSize: "0.95rem",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    width: "100%",
  },
  statCard: {
    background: "rgba(255,255,255,0.05)",
    borderRadius: "12px",
    padding: "16px",
    textAlign: "center" as const,
  },
  statLabel: {
    fontSize: "0.75rem",
    color: "#888",
    textTransform: "uppercase" as const,
    letterSpacing: "1px",
  },
  statValue: {
    fontSize: "1.5rem",
    fontWeight: "bold",
    marginTop: "4px",
  },
  hpBar: {
    width: "100%",
    height: "20px",
    background: "rgba(255,255,255,0.1)",
    borderRadius: "10px",
    overflow: "hidden",
  },
  hpFill: {
    height: "100%",
    borderRadius: "10px",
    transition: "width 0.5s ease",
  },
  traits: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap" as const,
    justifyContent: "center",
  },
  trait: {
    background: "rgba(255,255,255,0.1)",
    borderRadius: "20px",
    padding: "4px 12px",
    fontSize: "0.8rem",
  },
  actions: {
    display: "flex",
    gap: "12px",
    width: "100%",
  },
  btn: {
    flex: 1,
    padding: "12px",
    fontSize: "0.9rem",
    fontFamily: "'Courier New', monospace",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  shareSuccess: {
    color: "#6bcb77",
    fontSize: "0.85rem",
    textAlign: "center" as const,
  },
};

function getMoodColor(mood: string): string {
  const colors: Record<string, string> = {
    thriving: "#6bcb77",
    happy: "#4d96ff",
    neutral: "#ffd93d",
    tired: "#ff9f43",
    struggling: "#ff6b6b",
    dead: "#666",
  };
  return colors[mood] ?? "#888";
}

function getHpColor(hp: number): string {
  if (hp >= 70) return "#6bcb77";
  if (hp >= 40) return "#ffd93d";
  if (hp >= 20) return "#ff9f43";
  return "#ff6b6b";
}

export function CreatureView({
  display,
  onRefresh,
}: {
  display: CreatureDisplay;
  onRefresh: () => void;
}) {
  const [shareMsg, setShareMsg] = useState("");
  const { creature, metrics, ascii_art, status_message, share_text } = display;
  const moodColor = getMoodColor(creature.mood);

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ text: share_text });
      } else {
        await navigator.clipboard.writeText(share_text);
        setShareMsg("Copied to clipboard!");
        setTimeout(() => setShareMsg(""), 2000);
      }
    } catch {
      // User cancelled share
    }
  };

  return (
    <div style={styles.container}>
      {/* Tamagotchi */}
      <TamagotchiShell
        moodColor={moodColor}
        onButtonA={onRefresh}
        onButtonB={onRefresh}
        onButtonC={handleShare}
      >
        <PixelDog
          mood={creature.mood}
          evolutionStage={creature.evolution_stage}
          isAlive={creature.is_alive}
        />
        <div
          style={{
            fontSize: "0.55rem",
            fontFamily: "'Courier New', monospace",
            color: "#4a5a3a",
            marginTop: "6px",
            fontWeight: "bold",
            letterSpacing: "1px",
            textTransform: "uppercase",
            position: "relative",
            zIndex: 2,
          }}
        >
          {creature.name} — {creature.mood}
        </div>
      </TamagotchiShell>

      {/* Status Message */}
      <p style={styles.statusMessage}>{status_message}</p>

      {/* HP Bar */}
      <div style={{ width: "100%" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "4px",
            fontSize: "0.85rem",
          }}
        >
          <span>HP</span>
          <span>{Math.round(creature.health_points)}/100</span>
        </div>
        <div style={styles.hpBar}>
          <div
            style={{
              ...styles.hpFill,
              width: `${creature.health_points}%`,
              background: getHpColor(creature.health_points),
            }}
          />
        </div>
      </div>

      {/* Stats */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Recovery</div>
          <div style={{ ...styles.statValue, color: "#6bcb77" }}>
            {metrics ? `${Math.round(metrics.recovery)}%` : "—"}
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Sleep</div>
          <div style={{ ...styles.statValue, color: "#4d96ff" }}>
            {metrics ? `${Math.round(metrics.sleep_score)}%` : "—"}
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Strain</div>
          <div style={{ ...styles.statValue, color: "#ff9f43" }}>
            {metrics ? metrics.strain.toFixed(1) : "—"}
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Streak</div>
          <div style={{ ...styles.statValue, color: "#ffd93d" }}>
            {creature.streak_days}d
          </div>
        </div>
      </div>

      {/* Traits */}
      {creature.traits.length > 0 && (
        <div style={styles.traits}>
          {creature.traits.map((t) => (
            <span key={t} style={{ ...styles.trait, borderColor: moodColor }}>
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div style={styles.actions}>
        <button
          style={{
            ...styles.btn,
            background: "rgba(77, 150, 255, 0.2)",
            color: "#4d96ff",
          }}
          onClick={onRefresh}
        >
          Refresh
        </button>
        <button
          style={{
            ...styles.btn,
            background: "rgba(107, 203, 119, 0.2)",
            color: "#6bcb77",
          }}
          onClick={handleShare}
        >
          Share
        </button>
      </div>

      {shareMsg && <p style={styles.shareSuccess}>{shareMsg}</p>}
    </div>
  );
}
