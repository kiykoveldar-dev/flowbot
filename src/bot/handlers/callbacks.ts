import { Bot } from "grammy";
import {
  findOrCreateUser,
  getDayPlan,
  getStreak,
  todayDate,
  updateTask,
} from "../../database/db";
import {
  progressMessage,
  progressToggleKeyboard,
} from "../utils/messages";

export function registerCallbacks(bot: Bot): void {
  bot.callbackQuery("progress_toggle", async (ctx) => {
    const from = ctx.from;
    if (!from) return;

    const user = await findOrCreateUser(from.id, from.username, from.first_name);
    const date = todayDate();
    const { tasks } = await getDayPlan(user.id, date);

    if (tasks.length === 0) {
      await ctx.answerCallbackQuery({ text: "Сначала добавь цели через /plan" });
      return;
    }

    const streak = await getStreak(user.id);
    await ctx.editMessageText(progressMessage(date, tasks, streak.current_streak), {
      parse_mode: "Markdown",
      reply_markup: progressToggleKeyboard(tasks),
    });
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery("progress_show", async (ctx) => {
    const from = ctx.from;
    if (!from) return;

    const user = await findOrCreateUser(from.id, from.username, from.first_name);
    const date = todayDate();
    const { tasks } = await getDayPlan(user.id, date);
    const streak = await getStreak(user.id);

    await ctx.editMessageText(progressMessage(date, tasks, streak.current_streak), {
      parse_mode: "Markdown",
      reply_markup: progressToggleKeyboard(tasks),
    });
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^toggle_(\d+)$/, async (ctx) => {
    const from = ctx.from;
    if (!from) return;

    const taskId = parseInt(ctx.match[1], 10);
    const user = await findOrCreateUser(from.id, from.username, from.first_name);
    const date = todayDate();
    const { tasks } = await getDayPlan(user.id, date);
    const task = tasks.find((t) => t.id === taskId);

    if (!task) {
      await ctx.answerCallbackQuery({ text: "Задача не найдена" });
      return;
    }

    await updateTask(taskId, user.id, { completed: !task.completed });
    const updated = await getDayPlan(user.id, date);
    const streak = await getStreak(user.id);

    await ctx.editMessageText(
      progressMessage(date, updated.tasks, streak.current_streak),
      {
        parse_mode: "Markdown",
        reply_markup: progressToggleKeyboard(updated.tasks),
      }
    );
    await ctx.answerCallbackQuery({
      text: task.completed ? "Снято" : "Выполнено ✅",
    });
  });
}
