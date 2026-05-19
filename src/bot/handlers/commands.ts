import { Bot, Context } from "grammy";
import {
  checkStreakBreak,
  findOrCreateUser,
  getDayPlan,
  getStreak,
  todayDate,
} from "../../database/db";
import { getWebappUrl } from "../../shared/config";
import {
  helpMessage,
  mainMenuKeyboard,
  planKeyboard,
  progressMessage,
  progressToggleKeyboard,
  streakMessage,
  welcomeMessage,
} from "../utils/messages";

export function registerCommands(bot: Bot): void {
  bot.command("start", async (ctx) => {
    const user = ctx.from;
    if (user) {
      await findOrCreateUser(user.id, user.username, user.first_name);
    }

    await ctx.reply(welcomeMessage(user?.first_name), {
      parse_mode: "Markdown",
      reply_markup: planKeyboard(),
    });
    await ctx.reply("Используй меню ниже для быстрого доступа:", {
      reply_markup: mainMenuKeyboard(),
    });
  });

  bot.command("plan", async (ctx) => {
    await ctx.reply("📝 Открой планировщик и добавь цели на сегодня:", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🎯 Запланировать день", web_app: { url: getWebappUrl("plan") } }],
        ],
      },
    });
  });

  bot.command("progress", async (ctx) => {
    await sendProgressView(ctx);
  });

  bot.command("streak", async (ctx) => {
    const user = await ensureUser(ctx);
    if (!user) return;

    await checkStreakBreak(user.id, todayDate());
    const streak = await getStreak(user.id);
    await ctx.reply(streakMessage(streak), { parse_mode: "Markdown" });
  });

  bot.command("help", async (ctx) => {
    await ctx.reply(helpMessage(), { parse_mode: "Markdown" });
  });

  bot.hears("🎯 Запланировать день", async (ctx) => {
    await ctx.reply("📝 Планировщик:", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🎯 Запланировать день", web_app: { url: getWebappUrl("plan") } }],
        ],
      },
    });
  });

  bot.hears("📊 Прогресс", async (ctx) => {
    await sendProgressView(ctx);
  });

  bot.hears("🔥 Серия", async (ctx) => {
    const user = await ensureUser(ctx);
    if (!user) return;
    const streak = await getStreak(user.id);
    await ctx.reply(streakMessage(streak), { parse_mode: "Markdown" });
  });

  bot.hears("❓ Помощь", async (ctx) => {
    await ctx.reply(helpMessage(), { parse_mode: "Markdown" });
  });
}

async function sendProgressView(ctx: Context): Promise<void> {
  const user = await ensureUser(ctx);
  if (!user) return;

  const date = todayDate();
  const { tasks } = await getDayPlan(user.id, date);
  const streak = await getStreak(user.id);

  await ctx.reply(progressMessage(date, tasks, streak.current_streak), {
    parse_mode: "Markdown",
    reply_markup: tasks.length > 0 ? progressToggleKeyboard(tasks) : planKeyboard(),
  });
}

async function ensureUser(ctx: Context) {
  const from = ctx.from;
  if (!from) {
    await ctx.reply("Не удалось определить пользователя.");
    return null;
  }
  return findOrCreateUser(from.id, from.username, from.first_name);
}
