import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import authRoutes from "./routes/auth.js";
import apiRoutes from "./routes/api.js";
import { startCronJobs } from "./services/cron.js";

const app = express();
const PORT = parseInt(process.env.PORT || "3000");

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Simple cookie parser
app.use((req, _res, next) => {
  const cookieHeader = req.headers.cookie;
  (req as any).cookies = {};
  if (cookieHeader) {
    for (const cookie of cookieHeader.split(";")) {
      const [name, ...rest] = cookie.trim().split("=");
      (req as any).cookies[name] = rest.join("=");
    }
  }
  next();
});

// Routes
app.use("/auth", authRoutes);
app.use("/api", apiRoutes);

// Serve static frontend in production
const clientDist = path.join(process.cwd(), "dist", "client");
app.use(express.static(clientDist));
app.get("*", (_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

// Start cron only if WHOOP is configured (not in demo-only mode)
if (process.env.WHOOP_CLIENT_ID) {
  startCronJobs();
}

app.listen(PORT, () => {
  console.log(`🐾 BodyPet server running on http://localhost:${PORT}`);
});
