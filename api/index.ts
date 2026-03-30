import type { VercelRequest, VercelResponse } from "@vercel/node";
import express from "express";
import cors from "cors";
import authRoutes from "../src/server/routes/auth.js";
import apiRoutes from "../src/server/routes/api.js";
import { getDb } from "../src/server/db/schema.js";

const app = express();

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Cookie parser
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

// Ensure DB is initialized
getDb();

export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req as any, res as any);
}
