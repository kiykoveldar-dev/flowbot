import type { VercelRequest, VercelResponse } from "@vercel/node";
import serverless from "serverless-http";

let handler: ReturnType<typeof serverless> | undefined;

export default async function vercelHandler(
  req: VercelRequest,
  res: VercelResponse
): Promise<unknown> {
  if (!handler) {
    const { createApp } = await import("../dist/app");
    const app = await createApp();
    handler = serverless(app);
  }
  return handler(req, res);
}
