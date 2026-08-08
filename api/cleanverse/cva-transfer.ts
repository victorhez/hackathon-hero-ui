import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getCleanverseEnv, submitCvaTransfer, validateWallet } from "../_lib/cleanverse-api.js";

const VALID_PURPOSES = [
  "loan_issue",
  "collateral_lock",
  "collateral_release",
  "loan_repay",
  "lender_deposit",
  "lender_withdraw",
  "yield_payment",
] as const;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const from = validateWallet(String(req.body?.from ?? ""));
    const to = validateWallet(String(req.body?.to ?? ""));
    const asset = String(req.body?.asset ?? "");
    const amount = Number(req.body?.amount ?? NaN);
    const purpose = req.body?.purpose as (typeof VALID_PURPOSES)[number] | undefined;
    const chain = String(req.body?.chain ?? "Base");
    const reference = req.body?.reference ? String(req.body.reference) : undefined;

    if (!asset) {
      return res.status(400).json({ error: "Asset is required" });
    }
    if (typeof amount !== "number" || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: "Valid positive amount is required" });
    }
    if (!purpose || !VALID_PURPOSES.includes(purpose)) {
      return res
        .status(400)
        .json({ error: `Valid purpose required: ${VALID_PURPOSES.join(", ")}` });
    }

    const env = getCleanverseEnv();
    const result = await submitCvaTransfer(env, {
      from,
      to,
      asset,
      amount,
      purpose,
      chain,
      reference,
    });

    return res.status(200).json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid request";
    return res.status(400).json({ error: message });
  }
}
