import type { RunIndexSummary } from "@capiro/meri-contracts/conversation-history";

/** This contract already supplies USD, not micro-USD. Keep the received value intact. */
export function usageSummary(usage: RunIndexSummary["usage"]) {
  if (usage.recording === "not-recorded") return "Not recorded";
  if (usage.sdkEstimateUsd === null) return "Unavailable";
  const amount = usage.sdkEstimateUsd;
  const compact =
    amount > 0 && amount < 0.01
      ? "< $0.01"
      : new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(amount);
  return `${compact} USD${usage.recording === "unavailable" ? " (partial)" : ""}`;
}
