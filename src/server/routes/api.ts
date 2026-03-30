import { Router, Request, Response } from "express";
import { updateCreature } from "../services/creature.js";
import {
  getUserById,
  getLatestCreature,
  getRecentMetrics,
  upsertCreatureState,
  ensureDemoUser,
} from "../db/store.js";

const router = Router();

// Middleware: extract user from cookie, fallback to demo mode
function requireUser(req: Request, res: Response, next: () => void) {
  const userId = (req as any).cookies?.bodypet_user;
  if (userId) {
    const user = getUserById(userId);
    if (user) {
      (req as any).userId = userId;
      (req as any).isDemo = false;
      return next();
    }
  }

  // No auth cookie or user not found — use demo mode
  const demo = ensureDemoUser();
  (req as any).userId = demo.id;
  (req as any).isDemo = true;
  next();
}

// Get current creature state (with auto-refresh)
router.get("/creature", requireUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const isDemo = (req as any).isDemo;
    const today = new Date().toISOString().split("T")[0];
    const display = await updateCreature(userId, today);
    res.json({ ...display, is_demo: isDemo });
  } catch (err) {
    console.error("Creature fetch error:", err);
    res.status(500).json({ error: "Failed to update creature", detail: String(err) });
  }
});

// Force refresh from WHOOP
router.post("/creature/refresh", requireUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const isDemo = (req as any).isDemo;
    const today = new Date().toISOString().split("T")[0];
    const display = await updateCreature(userId, today);
    res.json({ ...display, is_demo: isDemo });
  } catch (err) {
    console.error("Refresh error:", err);
    res.status(500).json({ error: "Failed to refresh", detail: String(err) });
  }
});

// Get history
router.get("/history", requireUser, (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const days = parseInt(req.query.days as string) || 7;
    const metrics = getRecentMetrics(userId, days);
    res.json({ metrics });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

// Get user status
router.get("/me", requireUser, (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const isDemo = (req as any).isDemo;
  const user = getUserById(userId);
  const creature = getLatestCreature(userId);
  res.json({
    user_id: user?.id,
    is_demo: isDemo,
    has_creature: !!creature,
    creature_name: creature?.name ?? null,
    whoop_connected: !isDemo,
  });
});

// Rename creature
router.post("/creature/name", requireUser, (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { name } = req.body;
    if (!name || typeof name !== "string" || name.length > 20) {
      res.status(400).json({ error: "Name must be 1-20 characters" });
      return;
    }
    const creature = getLatestCreature(userId);
    if (creature) {
      upsertCreatureState({ ...creature, name, traits: creature.traits });
    }
    res.json({ name });
  } catch (err) {
    res.status(500).json({ error: "Failed to rename" });
  }
});

export default router;
