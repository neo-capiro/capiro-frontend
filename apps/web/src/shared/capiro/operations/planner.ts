import { plannerAttachmentOperations } from "./planner-attachments";
import { plannerBudgetOperations } from "./planner-budgets";
import { plannerCapacityOperations } from "./planner-capacity";
import { plannerManagementOperations } from "./planner-management";
import { plannerResourceOperations } from "./planner-resources";
import { plannerTaskOperations } from "./planner-tasks";
import { plannerTimeOperations } from "./planner-time";
import { plannerObjectiveOperations } from "./objective-work-destinations";
import { strategyMaterializationOperations } from "./strategy-materialization";
export const plannerOperations = {
  ...plannerMetricOperations,
  ...strategyMaterializationOperations,
  ...plannerObjectiveOperations,
  ...plannerTaskOperations,
  ...plannerResourceOperations,
  ...plannerTimeOperations,
  ...plannerCapacityOperations,
  ...plannerManagementOperations,
  ...plannerAttachmentOperations,
  ...plannerBudgetOperations,
} as const;
import { plannerMetricOperations } from "./planner-metrics";
