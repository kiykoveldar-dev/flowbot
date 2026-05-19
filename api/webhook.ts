import { createBot, setupBotCommands } from "../src/bot";

let bot: ReturnType<typeof createBot> | null = null;
let botReady = false;

async function getBot() {
  if (!bot) {
    bot = createBot();
    await setupBotCommands(bot);
  }

  if (!botReady) {
    await bot.init();
    botReady = true;
  }

  return bot;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  try {
    const telegramBot = await getBot();

    await telegramBot.handleUpdate(req.body);

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("Webhook error:", e);
    return res.status(500).json({ ok: false });
  }
}