export default async function handler(req: any, res: any) {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }
  
    console.log("Telegram webhook received");
  
    return res.status(200).json({ ok: true });
  }