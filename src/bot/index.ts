import { Bot } from "grammy";
import { config } from "../shared/config";
import { registerCallbacks } from "./handlers/callbacks";
import { registerCommands } from "./handlers/commands";
import { registerInline } from "./handlers/inline";
import { startScheduler } from "./scheduler";

export function createBot(): Bot {
  const bot = new Bot(config.botToken);

  registerCommands(bot);
  registerCallbacks(bot);
  registerInline(bot);

  bot.catch((err) => {
    console.error("Bot error:", err);
  });

  if (!config.isVercel) {
    startScheduler(bot);
  }

  return bot;
}

export async function setupBotCommands(bot: Bot): Promise<void> {
  await bot.api.setMyCommands([
    { command: "start", description: "Начать / приветствие" },
    { command: "plan", description: "Открыть планировщик" },
    { command: "progress", description: "Отметить прогресс" },
    { command: "streak", description: "Статистика серии" },
    { command: "help", description: "Справка" },
  ]);

  await bot.api.setMyDescription(
    "Ежедневник + шаринг прогресса. Планируй → делись → мотивируйся."
  );
}
