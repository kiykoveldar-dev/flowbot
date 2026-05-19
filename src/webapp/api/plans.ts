import { Router, Request, Response } from "express";
import {
  addTask,
  checkStreakBreak,
  deleteTask,
  findOrCreateUser,
  getDayPlan,
  getStreak,
  getWeekSummary,
  todayDate,
  updateTask,
} from "../../database/db";
import { resolveAuth } from "./auth";

const router = Router();

async function authenticate(req: Request, res: Response): Promise<number | null> {
  const initData =
    (typeof req.query.initData === "string" ? req.query.initData : undefined) ??
    req.body?.initData;

  const validated = resolveAuth(req.headers, initData ? { initData } : req.body);
  if (!validated) {
    res.status(401).json({ error: "Missing or invalid initData" });
    return null;
  }

  const user = await findOrCreateUser(
    validated.user.id,
    validated.user.username,
    validated.user.first_name
  );
  await checkStreakBreak(user.id, todayDate());
  return user.id;
}

router.get("/today", async (req: Request, res: Response) => {
  const userId = await authenticate(req, res);
  if (userId === null) return;

  const date = (req.query.date as string) || todayDate();
  const { plan, tasks } = await getDayPlan(userId, date);
  const streak = await getStreak(userId);

  res.json({
    date,
    planId: plan?.id ?? null,
    tasks,
    streak: streak.current_streak,
    longestStreak: streak.longest_streak,
  });
});

router.get("/week", async (req: Request, res: Response) => {
  const userId = await authenticate(req, res);
  if (userId === null) return;

  const date = (req.query.date as string) || todayDate();
  const week = await getWeekSummary(userId, date);
  const streak = await getStreak(userId);

  res.json({ week, streak: streak.current_streak });
});

router.post("/tasks", async (req: Request, res: Response) => {
  const userId = await authenticate(req, res);
  if (userId === null) return;

  const { title, date } = req.body as { title?: string; date?: string };
  if (!title?.trim()) {
    res.status(400).json({ error: "Title is required" });
    return;
  }

  const task = await addTask(userId, date || todayDate(), title);
  res.status(201).json({ task });
});

router.patch("/tasks/:id", async (req: Request, res: Response) => {
  const userId = await authenticate(req, res);
  if (userId === null) return;

  const taskId = parseInt(String(req.params.id), 10);
  const { title, completed } = req.body as { title?: string; completed?: boolean };

  const task = await updateTask(taskId, userId, { title, completed });
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const streak = await getStreak(userId);
  res.json({ task, streak: streak.current_streak });
});

router.delete("/tasks/:id", async (req: Request, res: Response) => {
  const userId = await authenticate(req, res);
  if (userId === null) return;

  const taskId = parseInt(String(req.params.id), 10);
  const ok = await deleteTask(taskId, userId);
  if (!ok) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.json({ ok: true });
});

export default router;
