import React from "react";
import { useCreature } from "../hooks/useCreature.js";
import { CreatureView } from "./CreatureView.js";
import { LoginScreen } from "./LoginScreen.js";

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)",
    color: "#e0e0e0",
    fontFamily: "'Courier New', monospace",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "20px",
  },
  header: {
    textAlign: "center" as const,
    marginBottom: "20px",
  },
  title: {
    fontSize: "2.5rem",
    fontWeight: "bold",
    background: "linear-gradient(90deg, #ff6b6b, #ffd93d, #6bcb77, #4d96ff)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    margin: 0,
  },
  subtitle: {
    color: "#888",
    fontSize: "0.9rem",
    marginTop: "4px",
  },
  loading: {
    fontSize: "1.5rem",
    marginTop: "100px",
    animation: "pulse 1.5s infinite",
  },
  error: {
    color: "#ff6b6b",
    marginTop: "100px",
    textAlign: "center" as const,
  },
};

export function App() {
  const { display, status, authUrl, refresh } = useCreature();

  return (
    <div style={styles.app}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { margin: 0; }
      `}</style>

      <header style={styles.header}>
        <h1 style={styles.title}>BodyPet</h1>
        <p style={styles.subtitle}>Your WHOOP-powered Tamagotchi</p>
      </header>

      {status === "loading" && (
        <div style={styles.loading}>Loading your creature...</div>
      )}

      {status === "unauthenticated" && <LoginScreen authUrl={authUrl} />}

      {status === "error" && (
        <div style={styles.error}>
          <p>Something went wrong!</p>
          <button
            onClick={refresh}
            style={{
              marginTop: "16px",
              padding: "10px 20px",
              background: "#4d96ff",
              border: "none",
              borderRadius: "8px",
              color: "white",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Try Again
          </button>
        </div>
      )}

      {status === "ready" && display && (
        <CreatureView display={display} onRefresh={refresh} />
      )}
    </div>
  );
}
