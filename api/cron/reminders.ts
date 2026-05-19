import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createBot } from "../../dist/bot";
import { sendEveningReminders, sendMorningReminders } from "../../dist/bot/reminders";
import { initDatabase } from "../../dist/database/db";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const auth = req.headers.authorization;
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  await initDatabase();
  const bot = createBot();
  const period = String(req.query.period ?? "morning");

  const sent =
    period === "evening"
      ? await sendEveningReminders(bot)
      : await sendMorningReminders(bot);

  res.status(200).json({ ok: true, period, sent });
}
