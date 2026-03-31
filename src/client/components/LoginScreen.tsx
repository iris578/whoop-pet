import React from "react";

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginTop: "60px",
    gap: "24px",
  },
  egg: {
    fontSize: "6rem",
    animation: "float 3s ease-in-out infinite",
  },
  text: {
    textAlign: "center" as const,
    maxWidth: "400px",
    lineHeight: "1.6",
    color: "#aaa",
  },
  button: {
    padding: "16px 40px",
    fontSize: "1.1rem",
    fontWeight: "bold",
    fontFamily: "'Courier New', monospace",
    background: "linear-gradient(135deg, #4d96ff, #6bcb77)",
    color: "white",
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
    transition: "transform 0.2s, box-shadow 0.2s",
    boxShadow: "0 4px 15px rgba(77, 150, 255, 0.3)",
  },
};

export function LoginScreen({ authUrl }: { authUrl: string }) {
  return (
    <div style={styles.container}>
      <div style={styles.egg}>🥚</div>
      <p style={styles.text}>
        A mysterious egg is waiting for you...<br />
        Connect your WHOOP to hatch your Whoopy and watch it evolve
        based on your real health data!
      </p>
      <a href={authUrl} style={{ textDecoration: "none" }}>
        <button
          style={styles.button}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = "scale(1.05)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          Connect WHOOP & Hatch
        </button>
      </a>
    </div>
  );
}
