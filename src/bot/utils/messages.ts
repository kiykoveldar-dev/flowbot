import { InlineKeyboard, Keyboard } from "grammy";
import { config, getWebappUrl } from "../../shared/config";
import type { Streak, Task } from "../../shared/types";
import { dayLabel } from "../../database/db";

export const BOT_DESCRIPTION =
  "Ежедневник + шаринг прогресса. Планируй → делись → мотивируйся.";

export function welcomeMessage(firstName?: string): string {
  const name = firstName ? `, ${firstName}` : "";
  return (
    `🌊 *Добро пожаловать в FlowBot${name}!*\n\n` +
    `${BOT_DESCRIPTION}\n\n` +
    `• Добавь 3 цели на день\n` +
    `• Получи красивую карточку прогресса\n` +
    `• Поделись в чате — получи поддержку\n\n` +
    `Нажми *🎯 Запланировать день*, чтобы начать!`
  );
}

export function streakMessage(streak: Streak): string {
  const current = streak.current_streak;
  const longest = streak.longest_streak;
  let motivation: string;

  if (current === 0) {
    motivation = "Отметь хотя бы одну задачу сегодня — и серия начнётся! 💪";
  } else if (current < 3) {
    motivation = "Отличное начало! Продолжай каждый день.";
  } else if (current < 7) {
    motivation = "Ты на волне! Не прерывай серию.";
  } else if (current < 30) {
    motivation = "Невероятная дисциплина! Так держать.";
  } else {
    motivation = "Легенда продуктивности! 🔥";
  }

  return (
    `🔥 *Твоя серия*\n\n` +
    `Текущая: *${current}* ${pluralDays(current)}\n` +
    `Рекорд: *${longest}* ${pluralDays(longest)}\n\n` +
    motivation
  );
}

function pluralDays(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return "дней";
  if (mod10 === 1) return "день";
  if (mod10 >= 2 && mod10 <= 4) return "дня";
  return "дней";
}

export function progressMessage(date: string, tasks: Task[], streak: number): string {
  if (tasks.length === 0) {
    return (
      `📋 На *${dayLabel(date)}* пока нет целей.\n\n` +
      `Открой планировщик и добавь задачи на день!`
    );
  }

  const done = tasks.filter((t) => t.completed).length;
  const lines = tasks
    .map((t) => `${t.completed ? "✅" : "⏳"} ${escapeMarkdown(t.title)}`)
    .join("\n");

  return (
    `📋 *План на ${dayLabel(date)}*\n` +
    `Прогресс: *${done}/${tasks.length}* · 🔥 ${streak} ${pluralDays(streak)}\n\n` +
    lines
  );
}

export function escapeMarkdown(text: string): string {
  return text.replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

export function planKeyboard(): InlineKeyboard {
  return new InlineKeyboard().webApp("🎯 Запланировать день", getWebappUrl());
}

export function progressKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .webApp("📝 Запланировать", getWebappUrl())
    .row()
    .text("✅ Отметить прогресс", "progress_toggle");
}

export function morningReminderKeyboard(): InlineKeyboard {
  return new InlineKeyboard().webApp("📝 Запланировать день", getWebappUrl("plan"));
}

export function eveningReminderKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .webApp("✅ Отметить прогресс", getWebappUrl("progress"))
    .text("📊 Статус", "progress_show");
}

export function progressToggleKeyboard(tasks: Task[]): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const task of tasks.slice(0, 8)) {
    const icon = task.completed ? "✅" : "⬜";
    const label = `${icon} ${task.title.slice(0, 28)}`;
    kb.text(label, `toggle_${task.id}`).row();
  }
  kb.webApp("📝 Открыть планировщик", getWebappUrl());
  return kb;
}

export function mainMenuKeyboard(): Keyboard {
  return new Keyboard()
    .text("🎯 Запланировать день")
    .text("📊 Прогресс")
    .row()
    .text("🔥 Серия")
    .text("❓ Помощь")
    .resized();
}

export function helpMessage(): string {
  return (
    `❓ *Справка FlowBot*\n\n` +
    `*Команды:*\n` +
    `/start — приветствие\n` +
    `/plan — открыть планировщик\n` +
    `/progress — отметить задачи\n` +
    `/streak — статистика серии\n` +
    `/help — эта справка\n\n` +
    `*Inline-режим:*\n` +
    `@${config.botUsername} день — карточка сегодня\n` +
    `@${config.botUsername} неделя — сводка за неделю\n\n` +
    `Планируй → делись → мотивируйся! 🌊`
  );
}

export const inlineShareCaption = `Планируй свой день с @${config.botUsername}`;
