import express, { type Express } from "express";
import { webhookCallback } from "grammy";
import type { Bot } from "grammy";
import { createBot, setupBotCommands } from "./bot";
import { initDatabase } from "./database/db";
import { config, validateConfig } from "./shared/config";
import { createWebappRouter } from "./webapp/server";

let webhookRegistered = false;

async function ensureTelegramWebhook(bot: Bot): Promise<void> {
  if (!config.webhookUrl || webhookRegistered) return;
  const url = `${config.webhookUrl.replace(/\/$/, "")}/webhook`;
  await bot.api.setWebhook(url, {
    allowed_updates: [
      "message",
      "callback_query",
      "inline_query",
      "chosen_inline_result",
    ],
  });
  webhookRegistered = true;
  console.log(`Webhook set: ${url}`);
}

export async function createApp(): Promise<Express> {
  validateConfig();

  initDatabase()
    .then(() => {
      console.log("DB connected");
    })
    .catch((e) => {
      console.error("DB init failed:", e);
    });
  
  const app = express();

  const webappRouter = createWebappRouter();
  app.use(webappRouter);

  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      service: "flowbot",
      localDev: config.localDev,
      vercel: config.isVercel,
      turso: config.useTurso,
    });
  });

  app.get("/", (_req, res) => {
    res.redirect("/app");
  });

  if (!config.localDev) {
    const bot = createBot();
    await setupBotCommands(bot);
    app.use("/webhook", webhookCallback(bot, "express"));

    if (config.isVercel && config.webhookUrl) {
      await ensureTelegramWebhook(bot);
    }
  }

  return app;
}
