import { Bot, type InlineKeyboard } from "grammy";
import { getAllUserTelegramIds } from "../database/db";
import {
  eveningReminderKeyboard,
  morningReminderKeyboard,
} from "./utils/messages";

export async function sendMorningReminders(bot: Bot): Promise<number> {
  return broadcast(
    bot,
    "🌅 *Время планировать день!*\n\nКакие 3 цели поставишь сегодня?",
    morningReminderKeyboard()
  );
}

export async function sendEveningReminders(bot: Bot): Promise<number> {
  return broadcast(
    bot,
    "📊 *Как дела с планами?*\n\nОтметь прогресс за сегодня — серия ждёт!",
    eveningReminderKeyboard()
  );
}

async function broadcast(
  bot: Bot,
  text: string,
  keyboard: InlineKeyboard
): Promise<number> {
  const ids = await getAllUserTelegramIds();
  let sent = 0;
  for (const telegramId of ids) {
    try {
      await bot.api.sendMessage(telegramId, text, {
        parse_mode: "Markdown",
        reply_markup: keyboard,
      });
      sent++;
    } catch {
      // User may have blocked the bot
    }
  }
  return sent;
}
