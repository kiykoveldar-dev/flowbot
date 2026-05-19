import crypto from "crypto";
import { config } from "../../shared/config";
import type { TelegramWebAppUser } from "../../shared/types";

export interface ValidatedInitData {
  user: TelegramWebAppUser;
  authDate: number;
  queryId?: string;
  startParam?: string;
}

export function validateTelegramWebAppData(initData: string): ValidatedInitData | null {
  if (!initData || !config.botToken) {
    return null;
  }

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;

  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(config.botToken)
    .digest();

  const calculatedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (calculatedHash !== hash) {
    return null;
  }

  const authDate = parseInt(params.get("auth_date") ?? "0", 10);
  const maxAge = 86400;
  if (Date.now() / 1000 - authDate > maxAge) {
    return null;
  }

  const userStr = params.get("user");
  if (!userStr) return null;

  try {
    const user = JSON.parse(userStr) as TelegramWebAppUser;
    return {
      user,
      authDate,
      queryId: params.get("query_id") ?? undefined,
      startParam: params.get("start_param") ?? undefined,
    };
  } catch {
    return null;
  }
}

const DEV_INIT_DATA = "local-dev-mode";

export function isLocalDevInitData(initData: string | null): boolean {
  return config.localDev && initData === DEV_INIT_DATA;
}

export function getDevValidatedData(): ValidatedInitData {
  return {
    user: { id: 999001, first_name: "Локальный", username: "dev_user" },
    authDate: Math.floor(Date.now() / 1000),
  };
}

export function resolveAuth(
  headers: Record<string, string | string[] | undefined>,
  body?: { initData?: string }
): ValidatedInitData | null {
  const initData = extractInitDataFromRequest(headers, body);
  if (isLocalDevInitData(initData)) {
    return getDevValidatedData();
  }
  if (!initData) return null;
  return validateTelegramWebAppData(initData);
}

export function extractInitDataFromRequest(
  headers: Record<string, string | string[] | undefined>,
  body?: { initData?: string }
): string | null {
  const header = headers["x-telegram-init-data"];
  if (typeof header === "string" && header) return header;
  if (body?.initData) return body.initData;
  return null;
}
