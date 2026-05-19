import { createBot, setupBotCommands } from "../src/bot";

let botPromise: ReturnType<typeof createBot> | null = null;

async function getBot() {
  if (!botPromise) {
    const bot = createBot();
    await setupBotCommands(bot);
    botPromise = bot;
  }

  return botPromise;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const bot = await getBot();

    await bot.handleUpdate(req.body);

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return res.status(500).json({ ok: false });
  }
}