import type { z } from "zod";
import type { budgetAmount } from "../../../../../shared/capiro/operations/legiwatch-budget-schemas";

/** Display exact server minor units without converting fiscal amounts to floats. */
export function formatMinorUnits(value: string) {
  if (!/^-?\d+$/.test(value)) return "Amount unavailable";
  const amount = BigInt(value),
    absolute = amount < 0n ? -amount : amount;
  return `${amount < 0n ? "−" : ""}$${(absolute / 100n).toLocaleString("en-US")}.${(absolute % 100n).toString().padStart(2, "0")}`;
}
export function retainedAmountLabel(amount: z.infer<typeof budgetAmount>) {
  if (amount.state !== "amount" || amount.minorUnits === null)
    return `${amount.state} · amount unavailable`;
  if (amount.measure !== "money")
    return `${amount.measure} · ${amount.minorUnits} retained units`;
  return formatMinorUnits(amount.minorUnits);
}
