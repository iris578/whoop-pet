import React, { useState, useEffect } from "react";
import { useCreature } from "../hooks/useCreature.js";
import { CreatureView } from "./CreatureView.js";
import { PrivacyPolicy } from "./PrivacyPolicy.js";

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
    fontSize: "3rem",
    fontFamily: "'Bangers', cursive",
    fontWeight: "normal",
    letterSpacing: "3px",
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
  demoBanner: {
    background: "rgba(255, 217, 61, 0.15)",
    border: "1px solid rgba(255, 217, 61, 0.3)",
    borderRadius: "10px",
    padding: "12px 20px",
    marginBottom: "16px",
    textAlign: "center" as const,
    fontSize: "0.85rem",
    color: "#ffd93d",
    maxWidth: "480px",
    width: "100%",
  },
  connectBtn: {
    display: "inline-block",
    marginTop: "8px",
    padding: "8px 20px",
    background: "linear-gradient(135deg, #4d96ff, #6bcb77)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontFamily: "'Courier New', monospace",
    fontWeight: "bold",
    fontSize: "0.85rem",
    textDecoration: "none",
  },
  footer: {
    marginTop: "40px",
    paddingTop: "16px",
    borderTop: "1px solid rgba(255,255,255,0.1)",
    fontSize: "0.8rem",
    color: "#666",
  },
  footerLink: {
    color: "#888",
    textDecoration: "none",
  },
};

function useRoute() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = (to: string) => {
    window.history.pushState({}, "", to);
    setPath(to);
  };

  return { path, navigate };
}

export function App() {
  const { path, navigate } = useRoute();
  const { display, status, isDemo, refresh } = useCreature();

  if (path === "/privacy") {
    return (
      <div style={styles.app}>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { margin: 0; }
        `}</style>
        <PrivacyPolicy />
      </div>
    );
  }

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
        <h1 style={styles.title}>Whoopy</h1>
        <p style={styles.subtitle}>Your WHOOP-powered Tamagotchi</p>
      </header>

      {status === "loading" && (
        <div style={styles.loading}>Loading your creature...</div>
      )}

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
        <>
          {isDemo && (
            <div style={styles.demoBanner}>
              Demo Mode — Using simulated health data
              <br />
              <a href="/api/auth" style={styles.connectBtn}>
                Connect WHOOP for Real Data
              </a>
            </div>
          )}
          <CreatureView display={display} onRefresh={refresh} />
        </>
      )}

      <footer style={styles.footer}>
        <a
          href="/privacy"
          onClick={(e) => {
            e.preventDefault();
            navigate("/privacy");
          }}
          style={styles.footerLink}
        >
          Privacy Policy
        </a>
      </footer>
    </div>
  );
}
