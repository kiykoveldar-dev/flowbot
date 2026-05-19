import { createBot, setupBotCommands } from "../src/bot";

let bot: ReturnType<typeof createBot> | null = null;

async function getBot() {
  if (!bot) {
    bot = createBot();
    await setupBotCommands(bot);
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

    return res.status(200).json({
      ok: true,
    });
  } catch (e) {
    console.error(e);

    return res.status(500).json({
      ok: false,
    });
  }
}