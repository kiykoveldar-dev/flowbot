import dotenv from "dotenv";
import path from "path";

dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  botToken: process.env.BOT_TOKEN ?? "",
  webhookUrl: process.env.WEBHOOK_URL ?? "",
  webappUrl: process.env.WEBAPP_URL ?? process.env.WEBHOOK_URL ?? "",
  localDev: process.env.LOCAL_DEV === "true",
  isVercel: process.env.VERCEL === "1",
  useTurso: Boolean(process.env.TURSO_DATABASE_URL),
  tursoUrl: process.env.TURSO_DATABASE_URL ?? "",
  tursoToken: process.env.TURSO_AUTH_TOKEN ?? "",
  cronSecret: process.env.CRON_SECRET ?? "",
  port: parseInt(process.env.PORT ?? "3000", 10),
  databasePath:
    process.env.DATABASE_PATH ??
    path.join(process.cwd(), "data", "flowbot.db"),
  botUsername: process.env.BOT_USERNAME ?? "flowbot",
  timezone: process.env.TZ ?? "Europe/Moscow",
};

export function validateConfig(): void {
  if (!config.botToken && !config.localDev) {
    throw new Error("BOT_TOKEN is required (or set LOCAL_DEV=true)");
  }
  if (config.isVercel && !config.useTurso && !config.localDev) {
    throw new Error(
      "On Vercel set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN (see DEPLOY_VERCEL.md)"
    );
  }
}

export function getWebappUrl(startParam?: string): string {
  const base = config.webappUrl.replace(/\/$/, "");
  if (startParam) {
    return `${base}/app?startapp=${encodeURIComponent(startParam)}`;
  }
  return `${base}/app`;
}

export function getMiniAppDirectLink(startapp: string): string {
  return `https://t.me/${config.botUsername}/app?startapp=${encodeURIComponent(startapp)}`;
}
