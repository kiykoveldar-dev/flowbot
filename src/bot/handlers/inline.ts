import { Bot, InlineKeyboard } from "grammy";
import {
  findOrCreateUser,
  getDayPlan,
  getStreak,
  searchPlans,
  todayDate,
} from "../../database/db";
import { config, getMiniAppDirectLink } from "../../shared/config";
import {
  getDynamicDayCardUrl,
  getDynamicWeekCardUrl,
} from "../utils/cards";
import { inlineShareCaption } from "../utils/messages";

export function registerInline(bot: Bot): void {
  bot.on("inline_query", async (ctx) => {
    const query = ctx.inlineQuery.query.trim().toLowerCase();
    const from = ctx.from;
    const user = await findOrCreateUser(from.id, from.username, from.first_name);
    const date = todayDate();
    const streak = await getStreak(user.id);
    const baseUrl = config.webappUrl || config.webhookUrl;

    if (!query || query === "день" || query === "day") {
      const { tasks } = await getDayPlan(user.id, date);
      const photoUrl = getDynamicDayCardUrl(baseUrl, from.id, date);

      await ctx.answerInlineQuery(
        [
          {
            type: "photo",
            id: `day_${date}`,
            photo_url: photoUrl,
            thumbnail_url: photoUrl,
            title: `Мой день — ${date}`,
            description: `${tasks.filter((t) => t.completed).length}/${tasks.length} выполнено · 🔥 ${streak.current_streak}`,
            caption: inlineShareCaption,
            parse_mode: "Markdown",
            reply_markup: new InlineKeyboard().url(
              "🎯 Запустить FlowBot",
              getMiniAppDirectLink("shared")
            ),
          },
          {
            type: "article",
            id: "day_text",
            title: "📋 Текстовая сводка дня",
            description: "Компактный вариант без картинки",
            input_message_content: {
              message_text: formatDayText(date, tasks, streak.current_streak),
              parse_mode: "Markdown",
            },
            reply_markup: new InlineKeyboard().url(
              "🎯 Запустить FlowBot",
              getMiniAppDirectLink("shared")
            ),
          },
        ],
        { cache_time: 30, is_personal: true }
      );
      return;
    }

    if (query === "неделя" || query === "week") {
      const photoUrl = getDynamicWeekCardUrl(baseUrl, from.id, date);

      await ctx.answerInlineQuery(
        [
          {
            type: "photo",
            id: `week_${date}`,
            photo_url: photoUrl,
            thumbnail_url: photoUrl,
            title: "Сводка за неделю",
            description: `🔥 Серия: ${streak.current_streak} дней`,
            caption: inlineShareCaption,
            reply_markup: new InlineKeyboard().url(
              "🎯 Запустить FlowBot",
              getMiniAppDirectLink("shared")
            ),
          },
        ],
        { cache_time: 60, is_personal: true }
      );
      return;
    }

    const results = await searchPlans(user.id, query);
    if (results.length === 0) {
      await ctx.answerInlineQuery(
        [
          {
            type: "article",
            id: "empty",
            title: "Ничего не найдено",
            description: `Попробуй «день» или «неделя»`,
            input_message_content: {
              message_text:
                `🔍 По запросу «${query}» планов не найдено.\n\n` +
                `Используй @${config.botUsername} день или неделя`,
            },
          },
        ],
        { cache_time: 10, is_personal: true }
      );
      return;
    }

    await ctx.answerInlineQuery(
      results.map((r, i) => {
        const done = r.tasks.filter((t) => t.completed).length;
        return {
          type: "article" as const,
          id: `search_${r.date}_${i}`,
          title: `📅 ${r.date}`,
          description: `${done}/${r.tasks.length} · ${r.tasks[0]?.title ?? ""}`,
          input_message_content: {
            message_text: formatDayText(r.date, r.tasks, streak.current_streak),
            parse_mode: "Markdown",
          },
        };
      }),
      { cache_time: 30, is_personal: true }
    );
  });
}

function formatDayText(
  date: string,
  tasks: { title: string; completed: boolean }[],
  streak: number
): string {
  const lines =
    tasks.length > 0
      ? tasks.map((t) => `${t.completed ? "✅" : "⏳"} ${t.title}`).join("\n")
      : "Нет целей";
  const done = tasks.filter((t) => t.completed).length;
  return (
    `🌊 *FlowBot — ${date}*\n` +
    `Прогресс: ${done}/${tasks.length} · 🔥 ${streak}\n\n` +
    lines +
    `\n\n_${inlineShareCaption}_`
  );
}
