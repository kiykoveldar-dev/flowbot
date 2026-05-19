import cron from "node-cron";
import { Bot } from "grammy";
import { sendEveningReminders, sendMorningReminders } from "./reminders";

export function startScheduler(bot: Bot): void {
  cron.schedule(
    "0 8 * * *",
    () => {
      void sendMorningReminders(bot);
    },
    { timezone: process.env.TZ ?? "Europe/Moscow" }
  );

  cron.schedule(
    "0 20 * * *",
    () => {
      void sendEveningReminders(bot);
    },
    { timezone: process.env.TZ ?? "Europe/Moscow" }
  );
}
