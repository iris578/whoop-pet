import React, { useState } from "react";
import type { CreatureDisplay } from "../../shared/types.js";
import { PixelDog } from "./PixelDog.js";

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

function Hearts({ hp }: { hp: number }) {
  const total = 5;
  const filled = Math.round((hp / 100) * total);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      {Array.from({ length: total }, (_, i) => {
        const heartIndex = total - 1 - i;
        const isFilled = heartIndex < filled;
        return (
          <div
            key={i}
            style={{
              fontSize: "18px",
              lineHeight: 1,
              color: isFilled ? "#e74c6f" : "#a09080",
              filter: "none",
              opacity: isFilled ? 1 : 0.6,
            }}
          >
            {isFilled ? "♥" : "♡"}
          </div>
        );
      })}
    </div>
  );
}

function StatBar({
  label,
  value,
  max,
  color,
  bgColor,
  icon,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  bgColor: string;
  icon: string;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div
      style={{
        width: "100%",
        position: "relative",
        background: bgColor,
        borderRadius: "20px",
        height: "36px",
        overflow: "hidden",
      }}
    >
      {/* Fill */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          height: "100%",
          width: `${pct}%`,
          background: color,
          borderRadius: "20px",
          transition: "width 0.5s ease",
        }}
      />
      {/* Label */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
          height: "100%",
        }}
      >
        <span style={{ fontSize: "14px" }}>{icon}</span>
        <span
          style={{
            fontSize: "0.8rem",
            fontWeight: "700",
            color: "#fff",
            fontFamily: "'Pixelify Sans', 'Courier New', monospace",
            textShadow: "0 1px 2px rgba(0,0,0,0.2)",
          }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

export function CreatureView({
  display,
  onRefresh,
}: {
  display: CreatureDisplay;
  onRefresh: () => void;
}) {
  const [shareMsg, setShareMsg] = useState("");
  const { creature, metrics, share_text, status_message } = display;
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
      // User cancelled
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "16px",
        maxWidth: "400px",
        width: "100%",
      }}
    >
      {/* Main Card */}
      <div
        style={{
          background: "#f5f0e3",
          borderRadius: "24px",
          padding: "24px",
          paddingTop: "60px",
          width: "100%",
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Level + Name (top-left, absolute) */}
        <div style={{ position: "absolute", top: "24px", left: "24px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
            <span
              style={{
                fontSize: "2.4rem",
                fontWeight: "700",
                color: "#2a2520",
                lineHeight: 1,
                fontFamily: "'Pixelify Sans', 'Courier New', monospace",
              }}
            >
              {creature.streak_days}
            </span>
            <span
              style={{
                fontSize: "0.9rem",
                color: "#8a7e6b",
                fontWeight: "700",
                fontFamily: "'Pixelify Sans', 'Courier New', monospace",
              }}
            >
              lvl
            </span>
          </div>
          <div
            style={{
              fontSize: "0.85rem",
              color: moodColor,
              fontWeight: "700",
              fontFamily: "'Pixelify Sans', 'Courier New', monospace",
              marginTop: "2px",
            }}
          >
            {creature.name}
          </div>
        </div>

        {/* Hearts (top-right, absolute) */}
        <div style={{ position: "absolute", top: "24px", right: "24px" }}>
          <Hearts hp={creature.health_points} />
        </div>

        {/* Creature (centered horizontally and vertically) */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            width: "100%",
            margin: "24px 0",
          }}
        >
          <PixelDog
            mood={creature.mood}
            evolutionStage={creature.evolution_stage}
            isAlive={creature.is_alive}
          />
        </div>

        {/* Stat Bars */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            marginTop: "16px",
            width: "100%",
          }}
        >
          <StatBar
            label="Recovery"
            value={metrics ? metrics.recovery : 0}
            max={100}
            color="#4a9e5c"
            bgColor="#d5f5dc"
            icon="💚"
          />
          <StatBar
            label="Sleep"
            value={metrics ? metrics.sleep_score : 0}
            max={100}
            color="#4a7ec4"
            bgColor="#d5e5f5"
            icon="😴"
          />
          <StatBar
            label="Strain"
            value={metrics ? metrics.strain : 0}
            max={21}
            color="#d48a30"
            bgColor="#fef0d5"
            icon="🔥"
          />
        </div>
      </div>

      {/* Status message */}
      <p
        style={{
          fontStyle: "italic",
          color: "#aaa",
          fontSize: "0.9rem",
          textAlign: "center",
        }}
      >
        {status_message}
      </p>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: "12px", width: "100%" }}>
        <button
          onClick={onRefresh}
          style={{
            flex: 1,
            padding: "12px",
            fontSize: "0.9rem",
            fontFamily: "'Courier New', monospace",
            fontWeight: "bold",
            border: "none",
            borderRadius: "12px",
            cursor: "pointer",
            background: "rgba(77, 150, 255, 0.2)",
            color: "#4d96ff",
          }}
        >
          Refresh
        </button>
        <button
          onClick={handleShare}
          style={{
            flex: 1,
            padding: "12px",
            fontSize: "0.9rem",
            fontFamily: "'Courier New', monospace",
            fontWeight: "bold",
            border: "none",
            borderRadius: "12px",
            cursor: "pointer",
            background: "rgba(107, 203, 119, 0.2)",
            color: "#6bcb77",
          }}
        >
          Share
        </button>
      </div>

      {shareMsg && (
        <p style={{ color: "#6bcb77", fontSize: "0.85rem", textAlign: "center" }}>
          {shareMsg}
        </p>
      )}
    </div>
  );
}
