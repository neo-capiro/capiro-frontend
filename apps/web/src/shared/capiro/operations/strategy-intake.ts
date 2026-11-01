import { z } from "zod";
import {
  parseStrategyIntake,
  type StrategyIntakeDraft,
} from "@capiro/shared/strategy-intake";

/** Use the server's public parser; do not maintain another set of form limits. */
export const strategyIntakeSchema = z
  .unknown()
  .transform((value, context): StrategyIntakeDraft => {
    try {
      return parseStrategyIntake(value);
    } catch (error) {
      context.addIssue({
        code: "custom",
        message:
          error instanceof Error ? error.message : "Invalid Strategy intake",
      });
      return z.NEVER;
    }
  });
