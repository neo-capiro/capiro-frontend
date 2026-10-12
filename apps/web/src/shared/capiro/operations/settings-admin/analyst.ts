import { analystAuditOperations } from "./analyst-audit";
import { analystPersonnelOperations } from "./analyst-personnel";
import { analystProgramsOperations } from "./analyst-programs";
import { analystReconciliationOperations } from "./analyst-reconciliation";

export const analystOperations = {
  ...analystProgramsOperations,
  ...analystReconciliationOperations,
  ...analystPersonnelOperations,
  ...analystAuditOperations,
} as const;
