import { useQuery, useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import * as api from "./api";
import { collectScoreInputs, getCleanverseEnv } from "./api";
import type { ScoreDimension } from "./types";

export function useCviStatus(wallet: string | null | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["cvi", wallet],
    queryFn: () => api.getCviStatus(getCleanverseEnv(), wallet!),
    enabled: !!wallet && (options?.enabled ?? true),
  });
}

export function useCvaBalances(wallet: string | null) {
  return useQuery({
    queryKey: ["cva", "balances", wallet],
    queryFn: () => api.getCvaBalances(getCleanverseEnv(), wallet!),
    enabled: !!wallet,
  });
}

export function useCvaHistory(wallet: string | null) {
  return useQuery({
    queryKey: ["cva", "history", wallet],
    queryFn: () => api.getCvaHistory(getCleanverseEnv(), wallet!),
    enabled: !!wallet,
  });
}

export function useScoreInputs(params: {
  wallet: string | null;
  repaymentValue: number;
  walletAgeDays: number;
}) {
  return useQuery<ScoreDimension[]>({
    queryKey: ["score", "inputs", params.wallet, params.repaymentValue, params.walletAgeDays],
    queryFn: () =>
      collectScoreInputs(
        getCleanverseEnv(),
        params.wallet!,
        params.repaymentValue,
        params.walletAgeDays,
      ),
    enabled: !!params.wallet,
  });
}

type CreateCviSessionInput = {
  wallet: string;
  redirectUrl: string;
  accountType?: "individual" | "institution";
  country?: string;
};

export function useCreateCviSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCviSessionInput) => api.createCviSession(getCleanverseEnv(), input),
    onSuccess: (_data: unknown, variables: CreateCviSessionInput) => {
      queryClient.invalidateQueries({ queryKey: ["cvi", variables.wallet] });
    },
  });
}

type SubmitCvaTransferInput = {
  from: string;
  to: string;
  asset: string;
  amount: number;
  purpose:
    | "loan_issue"
    | "collateral_lock"
    | "collateral_release"
    | "loan_repay"
    | "lender_deposit"
    | "lender_withdraw"
    | "yield_payment";
  chain: string;
  reference?: string;
};

export function useSubmitCvaTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SubmitCvaTransferInput) => api.submitCvaTransfer(getCleanverseEnv(), input),
    onSuccess: (_data: unknown, variables: SubmitCvaTransferInput) => {
      queryClient.invalidateQueries({ queryKey: ["cva", "balances", variables.from] });
      queryClient.invalidateQueries({ queryKey: ["cva", "balances", variables.to] });
      queryClient.invalidateQueries({ queryKey: ["cva", "history", variables.from] });
      queryClient.invalidateQueries({ queryKey: ["cva", "history", variables.to] });
    },
  });
}

export function invalidateCleanverseQueries(queryClient: QueryClient, wallet?: string) {
  if (wallet) {
    queryClient.invalidateQueries({ queryKey: ["cvi", wallet] });
    queryClient.invalidateQueries({ queryKey: ["cva", "balances", wallet] });
    queryClient.invalidateQueries({ queryKey: ["cva", "history", wallet] });
    queryClient.invalidateQueries({ queryKey: ["score", "inputs", wallet] });
  } else {
    queryClient.invalidateQueries({ queryKey: ["cvi"] });
    queryClient.invalidateQueries({ queryKey: ["cva"] });
    queryClient.invalidateQueries({ queryKey: ["score"] });
  }
}
