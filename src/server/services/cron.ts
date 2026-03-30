import { CronJob } from "cron";
import { getAllUsers } from "../db/queries.js";
import { updateCreature } from "./creature.js";

export function startCronJobs() {
  // Run daily at 8am UTC - fetch metrics for all users
  const dailyFetch = new CronJob("0 8 * * *", async () => {
    console.log("[cron] Starting daily metrics fetch...");
    const users = getAllUsers();
    const today = new Date().toISOString().split("T")[0];

    for (const user of users) {
      try {
        await updateCreature(user.id, today);
        console.log(`[cron] Updated creature for user ${user.id}`);
      } catch (err) {
        console.error(`[cron] Failed for user ${user.id}:`, err);
      }
    }
    console.log(`[cron] Done. Processed ${users.length} users.`);
  });

  dailyFetch.start();
  console.log("[cron] Daily metrics cron job scheduled (8:00 UTC)");
}
