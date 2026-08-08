import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getCleanverseEnv, createCviSession, validateWallet } from "../_lib/cleanverse-api";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const wallet = validateWallet(String(req.body?.wallet ?? ""));
    const redirectUrl = String(req.body?.redirectUrl ?? "");
    const accountType = req.body?.accountType as "individual" | "institution" | undefined;
    const country = req.body?.country ? String(req.body.country) : undefined;

    if (!redirectUrl) {
      return res.status(400).json({ error: "Redirect URL is required" });
    }

    const env = getCleanverseEnv();
    const result = await createCviSession(env, {
      wallet,
      redirectUrl,
      accountType,
      country,
    });

    return res.status(200).json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid request";
    return res.status(400).json({ error: message });
  }
}
