import fs from "fs";
import path from "path";
import * as PImage from "pureimage";
import type { Task } from "../../shared/types";
import { dayLabel, getWeekSummary } from "../../database/db";

const WIDTH = 600;
const PADDING = 40;

const COLORS = {
  light: {
    bg: "#ffffff",
    text: "#000000",
    muted: "#707579",
    accent: "#3390ec",
    border: "#e5e5e5",
    done: "#4fae4e",
    pending: "#999999",
  },
  dark: {
    bg: "#17212b",
    text: "#ffffff",
    muted: "#708499",
    accent: "#6ab2f2",
    border: "#2b3a4a",
    done: "#4fae4e",
    pending: "#708499",
  },
};

function getColors(theme: "light" | "dark" = "light") {
  return COLORS[theme];
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function fill(ctx: PImage.Context, color: string): void {
  const { r, g, b } = hexToRgb(color);
  ctx.fillStyle = `rgb(${r},${g},${b})`;
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

async function encodePng(
  img: PImage.Bitmap
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  const stream = PImage.encodePNGToStream(img);
  return new Promise((resolve, reject) => {
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

export interface DayCardInput {
  date: string;
  tasks: Task[];
  streak: number;
  userName?: string;
  theme?: "light" | "dark";
}

export async function generateDayCardPng(input: DayCardInput): Promise<Buffer> {
  const colors = getColors(input.theme ?? "light");
  const taskLines = input.tasks.length
    ? input.tasks
    : [{ title: "Нет целей на сегодня", completed: false } as Task];

  const lineHeight = 36;
  const headerHeight = 120;
  const footerHeight = 50;
  const tasksHeight = taskLines.length * lineHeight + 20;
  const height = headerHeight + tasksHeight + footerHeight + PADDING * 2;

  const img = PImage.make(WIDTH, height);
  const ctx = img.getContext("2d");

  fill(ctx, colors.bg);
  ctx.fillRect(0, 0, WIDTH, height);

  fill(ctx, colors.accent);
  ctx.fillRect(0, 0, WIDTH, 6);

  fill(ctx, colors.text);
  ctx.font = "28pt sans-serif";
  ctx.fillText("FlowBot", PADDING, PADDING + 28);

  fill(ctx, colors.muted);
  ctx.font = "18pt sans-serif";
  ctx.fillText(dayLabel(input.date), PADDING, PADDING + 58);

  const done = input.tasks.filter((t) => t.completed).length;
  const total = input.tasks.length;
  fill(ctx, colors.accent);
  ctx.font = "16pt sans-serif";
  const progressText =
    total > 0 ? `${done}/${total} выполнено` : "Добавь цели на день";
  ctx.fillText(progressText, PADDING, PADDING + 88);
  ctx.fillText(`День ${input.streak}`, WIDTH - PADDING - 80, PADDING + 88);

  let y = headerHeight + PADDING;
  fill(ctx, colors.border);
  ctx.fillRect(PADDING, y - 10, WIDTH - PADDING * 2, 1);

  ctx.font = "18pt sans-serif";
  for (const task of taskLines) {
    const icon = task.completed ? "[+]" : "[ ]";
    fill(ctx, task.completed ? colors.done : colors.pending);
    ctx.fillText(icon, PADDING, y);
    fill(ctx, colors.text);
    ctx.fillText(truncate(task.title, 42), PADDING + 40, y);
    y += lineHeight;
  }

  fill(ctx, colors.muted);
  ctx.font = "14pt sans-serif";
  ctx.fillText("@flowbot", WIDTH / 2 - 40, height - 24);

  return encodePng(img);
}

export interface WeekCardInput {
  userId: number;
  referenceDate: string;
  streak: number;
  theme?: "light" | "dark";
}

export async function generateWeekCardPng(input: WeekCardInput): Promise<Buffer> {
  const colors = getColors(input.theme ?? "light");
  const week = await getWeekSummary(input.userId, input.referenceDate);
  const dayNames = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  const height = 380;

  const img = PImage.make(WIDTH, height);
  const ctx = img.getContext("2d");

  fill(ctx, colors.bg);
  ctx.fillRect(0, 0, WIDTH, height);
  fill(ctx, colors.accent);
  ctx.fillRect(0, 0, WIDTH, 6);

  ctx.font = "28pt sans-serif";
  fill(ctx, colors.text);
  ctx.fillText("FlowBot - Неделя", PADDING, PADDING + 28);

  ctx.font = "16pt sans-serif";
  fill(ctx, colors.muted);
  ctx.fillText(`Серия: ${input.streak} дн.`, PADDING, PADDING + 60);

  const barY = 130;
  const barWidth = 60;
  const gap = (WIDTH - PADDING * 2 - barWidth * 7) / 6;
  const maxBarHeight = 120;

  week.forEach((day, i) => {
    const x = PADDING + i * (barWidth + gap);
    const ratio = day.total > 0 ? day.completed / day.total : 0;
    const barHeight = day.hasPlan ? Math.max(12, ratio * maxBarHeight) : 8;

    fill(ctx, day.hasPlan ? colors.accent : colors.border);
    ctx.fillRect(x, barY + maxBarHeight - barHeight, barWidth, barHeight);

    ctx.font = "14pt sans-serif";
    fill(ctx, colors.text);
    ctx.fillText(dayNames[i], x + 12, barY + maxBarHeight + 24);
  });

  const totalDone = week.reduce((s, d) => s + d.completed, 0);
  const totalTasks = week.reduce((s, d) => s + d.total, 0);

  ctx.font = "18pt sans-serif";
  fill(ctx, colors.text);
  ctx.fillText(
    `Итого: ${totalDone}/${totalTasks} задач`,
    PADDING,
    height - 60
  );

  fill(ctx, colors.muted);
  ctx.font = "14pt sans-serif";
  ctx.fillText("@flowbot", WIDTH / 2 - 40, height - 24);

  return encodePng(img);
}

const cardsDir = path.join(process.cwd(), "data", "cards");

export function saveCardBuffer(buffer: Buffer, filename: string): string {
  if (!fs.existsSync(cardsDir)) {
    fs.mkdirSync(cardsDir, { recursive: true });
  }
  const filePath = path.join(cardsDir, filename);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

export function getCardPublicUrl(baseUrl: string, filename: string): string {
  return `${baseUrl.replace(/\/$/, "")}/cards/${filename}`;
}

export function getDynamicDayCardUrl(
  baseUrl: string,
  telegramId: number,
  date: string
): string {
  return `${baseUrl.replace(/\/$/, "")}/api/cards/day/${telegramId}/${date}.png`;
}

export function getDynamicWeekCardUrl(
  baseUrl: string,
  telegramId: number,
  date: string
): string {
  return `${baseUrl.replace(/\/$/, "")}/api/cards/week/${telegramId}/${date}.png`;
}
