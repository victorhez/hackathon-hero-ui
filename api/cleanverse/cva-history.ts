import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getCleanverseEnv, getCvaHistory, validateWallet } from "../_lib/cleanverse-api.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST" && req.method !== "GET") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const walletRaw = req.method === "POST" ? req.body?.wallet : req.query.wallet;
    const wallet = validateWallet(String(walletRaw ?? ""));
    const env = getCleanverseEnv();
    const history = await getCvaHistory(env, wallet);
    return res.status(200).json(history);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid request";
    return res.status(400).json({ error: message });
  }
}
