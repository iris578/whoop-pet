import React from "react";

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: "720px",
    margin: "0 auto",
    padding: "40px 20px",
    color: "#e0e0e0",
    fontFamily: "'Courier New', monospace",
    lineHeight: "1.7",
  },
  title: {
    fontSize: "2rem",
    fontWeight: "bold",
    marginBottom: "8px",
    background: "linear-gradient(90deg, #ff6b6b, #ffd93d, #6bcb77, #4d96ff)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  updated: {
    color: "#888",
    fontSize: "0.85rem",
    marginBottom: "32px",
  },
  h2: {
    fontSize: "1.2rem",
    color: "#ffd93d",
    marginTop: "28px",
    marginBottom: "8px",
  },
  p: {
    color: "#ccc",
    marginBottom: "12px",
    fontSize: "0.9rem",
  },
  ul: {
    color: "#ccc",
    paddingLeft: "24px",
    marginBottom: "12px",
    fontSize: "0.9rem",
  },
  backLink: {
    display: "inline-block",
    marginTop: "32px",
    color: "#4d96ff",
    textDecoration: "none",
    fontSize: "0.9rem",
  },
};

export function PrivacyPolicy() {
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Privacy Policy</h1>
      <p style={styles.updated}>Last updated: March 31, 2026</p>

      <p style={styles.p}>
        BodyPet ("we", "our", or "the app") is a digital companion powered by
        your WHOOP health data. This Privacy Policy explains what data we
        collect, how we use it, and your rights.
      </p>

      <h2 style={styles.h2}>1. Information We Collect</h2>
      <p style={styles.p}>
        When you connect your WHOOP account, we access the following data
        through the WHOOP API:
      </p>
      <ul style={styles.ul}>
        <li>Recovery score</li>
        <li>Sleep performance score</li>
        <li>Strain score</li>
        <li>Heart rate variability (HRV)</li>
        <li>Resting heart rate (RHR)</li>
        <li>Basic profile information (WHOOP user ID)</li>
      </ul>
      <p style={styles.p}>
        We also store an authentication cookie in your browser to keep you
        logged in.
      </p>

      <h2 style={styles.h2}>2. How We Use Your Data</h2>
      <p style={styles.p}>Your health data is used solely to:</p>
      <ul style={styles.ul}>
        <li>Generate and update your BodyPet creature state</li>
        <li>Calculate mood, health points, evolution stage, and traits</li>
        <li>Track your daily streak</li>
        <li>Create shareable status cards (only when you choose to share)</li>
      </ul>
      <p style={styles.p}>
        We do not sell, rent, or share your personal health data with any third
        parties. We do not use your data for advertising purposes.
      </p>

      <h2 style={styles.h2}>3. Data Storage & Retention</h2>
      <p style={styles.p}>
        Your WHOOP credentials (OAuth tokens) are stored securely on our
        servers and used only to fetch your health data. Daily metrics and
        creature states are stored to maintain your streak and history. You may
        request deletion of your data at any time by contacting us.
      </p>

      <h2 style={styles.h2}>4. Data Sharing</h2>
      <p style={styles.p}>
        We do not share your data with third parties. The only time your
        creature data leaves our system is when you explicitly use the "Share"
        feature, which copies a text summary to your clipboard or uses your
        device's native share dialog. No data is sent to any external service
        automatically.
      </p>

      <h2 style={styles.h2}>5. WHOOP Integration</h2>
      <p style={styles.p}>
        BodyPet connects to WHOOP via OAuth 2.0. You can revoke access at any
        time through your WHOOP account settings. Once revoked, we will no
        longer be able to fetch new data, and you may request deletion of any
        previously stored data.
      </p>

      <h2 style={styles.h2}>6. Cookies</h2>
      <p style={styles.p}>
        We use a single essential cookie (<code>bodypet_user</code>) to
        maintain your session. We do not use tracking cookies, analytics
        cookies, or any third-party cookies.
      </p>

      <h2 style={styles.h2}>7. Children's Privacy</h2>
      <p style={styles.p}>
        BodyPet is not directed at children under 13. We do not knowingly
        collect personal information from children under 13. If you believe a
        child has provided us with personal data, please contact us and we will
        delete it.
      </p>

      <h2 style={styles.h2}>8. Your Rights</h2>
      <p style={styles.p}>You have the right to:</p>
      <ul style={styles.ul}>
        <li>Access the data we store about you</li>
        <li>Request correction of inaccurate data</li>
        <li>Request deletion of all your data</li>
        <li>Revoke WHOOP access at any time</li>
        <li>Export your data in a portable format</li>
      </ul>

      <h2 style={styles.h2}>9. Security</h2>
      <p style={styles.p}>
        We use industry-standard security measures including encrypted
        connections (HTTPS), secure token storage, and automatic token refresh
        to protect your data. However, no method of transmission or storage is
        100% secure.
      </p>

      <h2 style={styles.h2}>10. Changes to This Policy</h2>
      <p style={styles.p}>
        We may update this Privacy Policy from time to time. Changes will be
        posted on this page with an updated "Last updated" date. Continued use
        of BodyPet after changes constitutes acceptance of the revised policy.
      </p>

      <h2 style={styles.h2}>11. Contact</h2>
      <p style={styles.p}>
        If you have any questions about this Privacy Policy or wish to exercise
        your data rights, please open an issue on our{" "}
        <a
          href="https://github.com/iris578/whoop-pet"
          style={{ color: "#4d96ff" }}
        >
          GitHub repository
        </a>
        .
      </p>

      <a href="/" style={styles.backLink}>
        &larr; Back to BodyPet
      </a>
    </div>
  );
}
