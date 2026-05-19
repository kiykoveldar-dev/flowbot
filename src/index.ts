import { createApp } from "./app";
import { config } from "./shared/config";

async function main(): Promise<void> {
  const app = await createApp();

  app.listen(config.port, () => {
    const base = config.webappUrl || `http://localhost:${config.port}`;
    console.log(`FlowBot server listening on port ${config.port}`);
    console.log(`Mini App: ${base}/app`);

    if (config.localDev) {
      console.log("LOCAL_DEV=true — bot disabled, browser preview enabled");
    }
  });
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
