import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  getCleanverseEnv,
  collectScoreInputs,
  validateWallet,
  deterministicWalletAgeDays,
} from "../_lib/cleanverse-api";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST" && req.method !== "GET") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const walletRaw = req.method === "POST" ? req.body?.wallet : req.query.wallet;
    const wallet = validateWallet(String(walletRaw ?? ""));
    const repaymentValueRaw =
      req.method === "POST" ? req.body?.repaymentValue : req.query.repaymentValue;
    const walletAgeDaysRaw =
      req.method === "POST" ? req.body?.walletAgeDays : req.query.walletAgeDays;

    const repaymentValue =
      repaymentValueRaw !== undefined ? Math.max(0, Math.min(100, Number(repaymentValueRaw))) : 50;
    const walletAgeDays =
      walletAgeDaysRaw !== undefined
        ? Number(walletAgeDaysRaw)
        : deterministicWalletAgeDays(wallet);

    const env = getCleanverseEnv();
    const dimensions = await collectScoreInputs(env, wallet, repaymentValue, walletAgeDays);

    const score = Math.max(
      0,
      Math.min(100, Math.round(dimensions.reduce((acc, d) => acc + d.value * d.weight, 0) / 100)),
    );

    return res.status(200).json({ dimensions, score, walletAgeDays });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid request";
    return res.status(400).json({ error: message });
  }
}
