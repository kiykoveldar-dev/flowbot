import fs from "fs";
import path from "path";
import type { DailyPlan, Streak, Task, User, WeekDaySummary } from "../shared/types";
import { getDriver } from "./driver";

let schemaReady = false;

function loadSchema(): string {
  const candidates = [
    path.join(__dirname, "schema.sql"),
    path.join(process.cwd(), "src", "database", "schema.sql"),
    path.join(process.cwd(), "dist", "database", "schema.sql"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return fs.readFileSync(p, "utf-8");
  }
  throw new Error("schema.sql not found");
}

export async function initDatabase(): Promise<void> {
  if (schemaReady) return;
  await getDriver().exec(loadSchema());
  schemaReady = true;
}

export function todayDate(): string {
  return formatDate(new Date());
}

export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(dateStr: string, days: number): string {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

export function getWeekStart(dateStr: string): string {
  const d = parseDate(dateStr);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return formatDate(d);
}

function rowToTask(row: Record<string, unknown>): Task {
  return {
    id: Number(row.id),
    plan_id: Number(row.plan_id),
    title: row.title as string,
    completed: Boolean(row.completed),
    order_index: Number(row.order_index),
    created_at: row.created_at as string,
  };
}

async function sqlGet<T>(query: string, ...params: unknown[]): Promise<T | undefined> {
  return getDriver().get<T>(query, ...params);
}

async function sqlAll<T>(query: string, ...params: unknown[]): Promise<T[]> {
  return getDriver().all<T>(query, ...params);
}

async function sqlRun(query: string, ...params: unknown[]): Promise<void> {
  await getDriver().run(query, ...params);
}

async function sqlRunInsert(query: string, ...params: unknown[]): Promise<number> {
  return getDriver().runInsert(query, ...params);
}

async function sqlRunChanges(query: string, ...params: unknown[]): Promise<number> {
  return getDriver().runChanges(query, ...params);
}

export async function findOrCreateUser(
  telegramId: number,
  username?: string,
  firstName?: string
): Promise<User> {
  let user = await sqlGet<User>("SELECT * FROM users WHERE telegram_id = ?", telegramId);

  if (!user) {
    const userId = await sqlRunInsert(
      "INSERT INTO users (telegram_id, username, first_name) VALUES (?, ?, ?)",
      telegramId,
      username ?? null,
      firstName ?? null
    );
    await sqlRun(
      "INSERT INTO streaks (user_id, current_streak, longest_streak) VALUES (?, 0, 0)",
      userId
    );
    user = (await sqlGet<User>("SELECT * FROM users WHERE id = ?", userId))!;
  } else if (username !== undefined || firstName !== undefined) {
    await sqlRun(
      "UPDATE users SET username = COALESCE(?, username), first_name = COALESCE(?, first_name) WHERE id = ?",
      username ?? null,
      firstName ?? null,
      user.id
    );
    user = (await sqlGet<User>("SELECT * FROM users WHERE id = ?", user.id))!;
  }

  return user;
}

export async function getUserByTelegramId(telegramId: number): Promise<User | undefined> {
  return sqlGet<User>("SELECT * FROM users WHERE telegram_id = ?", telegramId);
}

export async function getOrCreatePlan(userId: number, date: string): Promise<DailyPlan> {
  let plan = await sqlGet<DailyPlan>(
    "SELECT * FROM daily_plans WHERE user_id = ? AND date = ?",
    userId,
    date
  );

  if (!plan) {
    const planId = await sqlRunInsert(
      "INSERT INTO daily_plans (user_id, date) VALUES (?, ?)",
      userId,
      date
    );
    plan = (await sqlGet<DailyPlan>("SELECT * FROM daily_plans WHERE id = ?", planId))!;
  }
  return plan;
}

export async function getTasksForPlan(planId: number): Promise<Task[]> {
  const rows = await sqlAll<Record<string, unknown>>(
    "SELECT * FROM tasks WHERE plan_id = ? ORDER BY order_index ASC, id ASC",
    planId
  );
  return rows.map(rowToTask);
}

export async function getDayPlan(
  userId: number,
  date: string
): Promise<{ plan: DailyPlan | null; tasks: Task[] }> {
  const plan = await sqlGet<DailyPlan>(
    "SELECT * FROM daily_plans WHERE user_id = ? AND date = ?",
    userId,
    date
  );

  if (!plan) {
    return { plan: null, tasks: [] };
  }
  return { plan, tasks: await getTasksForPlan(plan.id) };
}

export async function addTask(userId: number, date: string, title: string): Promise<Task> {
  const plan = await getOrCreatePlan(userId, date);
  const maxOrder = (await sqlGet<{ m: number }>(
    "SELECT COALESCE(MAX(order_index), -1) as m FROM tasks WHERE plan_id = ?",
    plan.id
  ))!;
  const orderIndex = maxOrder.m + 1;
  const taskId = await sqlRunInsert(
    "INSERT INTO tasks (plan_id, title, order_index) VALUES (?, ?, ?)",
    plan.id,
    title.trim(),
    orderIndex
  );
  return rowToTask(
    (await sqlGet<Record<string, unknown>>("SELECT * FROM tasks WHERE id = ?", taskId))!
  );
}

export async function updateTask(
  taskId: number,
  userId: number,
  updates: { title?: string; completed?: boolean }
): Promise<Task | null> {
  const task = await sqlGet<Record<string, unknown>>(
    `SELECT t.* FROM tasks t
     JOIN daily_plans p ON p.id = t.plan_id
     WHERE t.id = ? AND p.user_id = ?`,
    taskId,
    userId
  );

  if (!task) return null;

  if (updates.title !== undefined) {
    await sqlRun("UPDATE tasks SET title = ? WHERE id = ?", updates.title, taskId);
  }
  if (updates.completed !== undefined) {
    await sqlRun(
      "UPDATE tasks SET completed = ? WHERE id = ?",
      updates.completed ? 1 : 0,
      taskId
    );
  }

  const updated = (await sqlGet<Record<string, unknown>>(
    "SELECT * FROM tasks WHERE id = ?",
    taskId
  ))!;
  const row = rowToTask(updated);

  if (updates.completed === true) {
    const plan = (await sqlGet<{ date: string }>(
      "SELECT date FROM daily_plans WHERE id = ?",
      task.plan_id as number
    ))!;
    await maybeUpdateStreak(userId, plan.date);
  }

  return row;
}

export async function deleteTask(taskId: number, userId: number): Promise<boolean> {
  const changes = await sqlRunChanges(
    `DELETE FROM tasks WHERE id = ? AND plan_id IN (
       SELECT id FROM daily_plans WHERE user_id = ?
     )`,
    taskId,
    userId
  );
  return changes > 0;
}

export async function getStreak(userId: number): Promise<Streak> {
  let streak = await sqlGet<Streak>("SELECT * FROM streaks WHERE user_id = ?", userId);

  if (!streak) {
    await sqlRun(
      "INSERT INTO streaks (user_id, current_streak, longest_streak) VALUES (?, 0, 0)",
      userId
    );
    streak = (await sqlGet<Streak>("SELECT * FROM streaks WHERE user_id = ?", userId))!;
  }
  return streak;
}

export async function maybeUpdateStreak(userId: number, date: string): Promise<void> {
  const { plan, tasks } = await getDayPlan(userId, date);
  if (!plan || tasks.length === 0) return;

  const completedCount = tasks.filter((t) => t.completed).length;
  if (completedCount < 1) return;

  const streak = await getStreak(userId);
  const yesterday = addDays(date, -1);
  let newStreak = 1;

  if (streak.last_completed_date === date) {
    return;
  }

  if (streak.last_completed_date === yesterday) {
    newStreak = streak.current_streak + 1;
  }

  const longest = Math.max(streak.longest_streak, newStreak);
  await sqlRun(
    `UPDATE streaks SET current_streak = ?, longest_streak = ?, last_completed_date = ?
     WHERE user_id = ?`,
    newStreak,
    longest,
    date,
    userId
  );
}

export async function checkStreakBreak(userId: number, today: string): Promise<void> {
  const streak = await getStreak(userId);
  if (!streak.last_completed_date) return;

  const yesterday = addDays(today, -1);
  if (streak.last_completed_date !== today && streak.last_completed_date !== yesterday) {
    await sqlRun("UPDATE streaks SET current_streak = 0 WHERE user_id = ?", userId);
  }
}

export async function getWeekSummary(
  userId: number,
  referenceDate: string
): Promise<WeekDaySummary[]> {
  const weekStart = getWeekStart(referenceDate);
  const summaries: WeekDaySummary[] = [];

  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart, i);
    const { plan, tasks } = await getDayPlan(userId, date);
    summaries.push({
      date,
      total: tasks.length,
      completed: tasks.filter((t) => t.completed).length,
      hasPlan: plan !== null && tasks.length > 0,
    });
  }
  return summaries;
}

export async function searchPlans(
  userId: number,
  query: string,
  limit = 5
): Promise<Array<{ date: string; tasks: Task[] }>> {
  const rows = await sqlAll<{ date: string }>(
    `SELECT DISTINCT p.date FROM daily_plans p
     JOIN tasks t ON t.plan_id = p.id
     WHERE p.user_id = ? AND t.title LIKE ?
     ORDER BY p.date DESC
     LIMIT ?`,
    userId,
    `%${query}%`,
    limit
  );

  const results: Array<{ date: string; tasks: Task[] }> = [];
  for (const row of rows) {
    const { tasks } = await getDayPlan(userId, row.date);
    results.push({ date: row.date, tasks });
  }
  return results;
}

export async function getAllUserTelegramIds(): Promise<number[]> {
  const rows = await sqlAll<{ telegram_id: number }>("SELECT telegram_id FROM users");
  return rows.map((r) => r.telegram_id);
}

export function dayLabel(dateStr: string): string {
  const days = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  const months = [
    "янв", "фев", "мар", "апр", "май", "июн",
    "июл", "авг", "сен", "окт", "ноя", "дек",
  ];
  const d = parseDate(dateStr);
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
}
