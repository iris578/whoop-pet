import React from "react";

interface TamagotchiShellProps {
  children: React.ReactNode;
  moodColor: string;
  onButtonA?: () => void;
  onButtonB?: () => void;
  onButtonC?: () => void;
}

export function TamagotchiShell({
  children,
  moodColor,
  onButtonA,
  onButtonB,
  onButtonC,
}: TamagotchiShellProps) {
  return (
    <div style={shell}>
      {/* Top bump / loop */}
      <div style={topLoop} />

      {/* Body */}
      <div style={body}>
        {/* Screen bezel */}
        <div style={bezel}>
          {/* LCD screen */}
          <div style={screen}>
            {/* Scanline overlay */}
            <div style={scanlines} />
            {children}
          </div>
        </div>

        {/* Label */}
        <div style={label}>WHOOPY</div>

        {/* Buttons */}
        <div style={buttonRow}>
          <button style={btn} onClick={onButtonA} title="Refresh">
            <div style={btnIcon}>&#9664;</div>
          </button>
          <button style={{ ...btn, ...btnCenter }} onClick={onButtonB} title="Select">
            <div style={btnIcon}>&#9679;</div>
          </button>
          <button style={btn} onClick={onButtonC} title="Share">
            <div style={btnIcon}>&#9654;</div>
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Styles ---

const shell: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  animation: "float 4s ease-in-out infinite",
};

const topLoop: React.CSSProperties = {
  width: "40px",
  height: "20px",
  borderRadius: "20px 20px 0 0",
  border: "4px solid #555",
  borderBottom: "none",
  background: "transparent",
  marginBottom: "-2px",
};

const body: React.CSSProperties = {
  width: "260px",
  background: "linear-gradient(145deg, #3a3a5c, #2a2a42)",
  borderRadius: "130px 130px 100px 100px",
  padding: "24px 20px 30px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  boxShadow:
    "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)",
  border: "3px solid #4a4a6a",
  position: "relative",
};

const bezel: React.CSSProperties = {
  background: "#2a2a3a",
  borderRadius: "12px",
  padding: "6px",
  boxShadow: "inset 0 2px 8px rgba(0,0,0,0.6)",
  width: "200px",
};

const screen: React.CSSProperties = {
  background: "#9ead86",
  borderRadius: "8px",
  width: "100%",
  minHeight: "140px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "16px 8px",
  position: "relative",
  overflow: "hidden",
  boxShadow: "inset 0 0 20px rgba(0,0,0,0.15)",
};

const scanlines: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background:
    "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)",
  pointerEvents: "none",
  zIndex: 1,
};

const label: React.CSSProperties = {
  marginTop: "10px",
  fontSize: "0.7rem",
  fontWeight: "bold",
  letterSpacing: "4px",
  color: "#8888aa",
  textTransform: "uppercase",
};

const buttonRow: React.CSSProperties = {
  display: "flex",
  gap: "16px",
  marginTop: "14px",
};

const btn: React.CSSProperties = {
  width: "36px",
  height: "36px",
  borderRadius: "50%",
  border: "2px solid #5a5a7a",
  background: "linear-gradient(145deg, #4a4a6a, #3a3a5a)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 3px 6px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)",
  transition: "transform 0.1s",
  padding: 0,
};

const btnCenter: React.CSSProperties = {
  width: "40px",
  height: "40px",
  background: "linear-gradient(145deg, #5a5a8a, #4a4a6a)",
};

const btnIcon: React.CSSProperties = {
  color: "#aaaace",
  fontSize: "12px",
  lineHeight: 1,
};
