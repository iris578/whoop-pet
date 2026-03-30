import { Router, Request, Response } from "express";
import { updateCreature } from "../services/creature.js";
import { getUserById, getLatestCreature, getRecentMetrics, upsertCreatureState } from "../db/queries.js";

const router = Router();

// Middleware: extract user from cookie
function requireUser(req: Request, res: Response, next: () => void) {
  const userId = req.cookies?.bodypet_user;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated", auth_url: "/auth/whoop" });
    return;
  }
  const user = getUserById(userId);
  if (!user) {
    res.status(401).json({ error: "User not found", auth_url: "/auth/whoop" });
    return;
  }
  (req as any).userId = userId;
  next();
}

// Get current creature state (with auto-refresh)
router.get("/creature", requireUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const today = new Date().toISOString().split("T")[0];
    const display = await updateCreature(userId, today);
    res.json(display);
  } catch (err) {
    console.error("Creature fetch error:", err);
    res.status(500).json({ error: "Failed to update creature" });
  }
});

// Force refresh from WHOOP
router.post("/creature/refresh", requireUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const today = new Date().toISOString().split("T")[0];
    // Force fresh fetch by passing today's date
    const display = await updateCreature(userId, today);
    res.json(display);
  } catch (err) {
    console.error("Refresh error:", err);
    res.status(500).json({ error: "Failed to refresh" });
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
  const user = getUserById(userId);
  const creature = getLatestCreature(userId);
  res.json({
    user_id: user!.id,
    has_creature: !!creature,
    creature_name: creature?.name ?? null,
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
    // Update via the creature engine on next refresh
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
