import express, { Request, Response } from "express";
import fs from "fs";
import path from "path";
import {
  findOrCreateUser,
  getDayPlan,
  getStreak,
  getUserByTelegramId,
  todayDate,
} from "../database/db";
import { config } from "../shared/config";
import {
  generateDayCardPng,
  generateWeekCardPng,
  getDynamicDayCardUrl,
} from "../bot/utils/cards";
import plansRouter from "./api/plans";
import { resolveAuth } from "./api/auth";

export function createWebappRouter(): express.Router {
  const router = express.Router();

  router.use(express.json());
  router.use("/api", plansRouter);

  router.get(
    "/api/cards/day/:telegramId/:date",
    async (req: Request, res: Response) => {
      const telegramId = parseInt(String(req.params.telegramId), 10);
      const date = String(req.params.date).replace(/\.png$/i, "");
      const user = await getUserByTelegramId(telegramId);
      if (!user) {
        res.status(404).end();
        return;
      }

      const { tasks } = await getDayPlan(user.id, date);
      const streak = await getStreak(user.id);
      const buffer = await generateDayCardPng({
        date,
        tasks,
        streak: streak.current_streak,
        userName: user.first_name ?? undefined,
      });

      res.setHeader("Content-Type", "image/png");
      res.setHeader("Cache-Control", "public, max-age=60");
      res.send(buffer);
    }
  );

  router.get(
    "/api/cards/week/:telegramId/:date",
    async (req: Request, res: Response) => {
      const telegramId = parseInt(String(req.params.telegramId), 10);
      const date = String(req.params.date).replace(/\.png$/i, "");
      const user = await getUserByTelegramId(telegramId);
      if (!user) {
        res.status(404).end();
        return;
      }

      const streak = await getStreak(user.id);
      const buffer = await generateWeekCardPng({
        userId: user.id,
        referenceDate: date,
        streak: streak.current_streak,
      });

      res.setHeader("Content-Type", "image/png");
      res.setHeader("Cache-Control", "public, max-age=120");
      res.send(buffer);
    }
  );

  router.post("/api/card", async (req: Request, res: Response) => {
    const validated = resolveAuth(req.headers, req.body);
    if (!validated) {
      res.status(401).json({ error: "Missing or invalid initData" });
      return;
    }

    const user = await findOrCreateUser(
      validated.user.id,
      validated.user.username,
      validated.user.first_name
    );
    const date = (req.body?.date as string) || todayDate();
    const base = config.webappUrl || config.webhookUrl;
    const url = getDynamicDayCardUrl(base, validated.user.id, date);

    res.json({ url, filename: `day_${user.id}_${date}.png` });
  });

  const publicDir = resolvePublicDir();
  router.use("/app", express.static(publicDir));
  router.get("/app", (_req, res) => {
    res.sendFile(path.join(publicDir, "index.html"));
  });

  if (!config.isVercel) {
    const cardsDir = path.join(process.cwd(), "data", "cards");
    router.use("/cards", express.static(cardsDir));
  }

  return router;
}

function resolvePublicDir(): string {
  const candidates = [
    path.join(process.cwd(), "public", "app"),
    path.join(__dirname, "public"),
    path.join(process.cwd(), "src", "webapp", "public"),
    path.join(process.cwd(), "dist", "webapp", "public"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(path.join(p, "index.html"))) return p;
  }
  return path.join(process.cwd(), "public", "app");
}
