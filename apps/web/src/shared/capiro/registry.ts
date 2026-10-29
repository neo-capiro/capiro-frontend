import type { OperationRegistry } from "./contracts";
import { siteWorkflowOperations } from "./operations/site-workflows";
import { memoryReviewOperations } from "./operations/memory-review";
import { memoryGrantOperations } from "./operations/memory-grants";
import { memoryFilesOperations } from "./operations/memory-files";
import { memoryGovernanceOperations } from "./operations/memory-governance";
import { completedReportOperations } from "./operations/meri-completed-reports";
import { meriFirmSkillOperations } from "./operations/meri-firm-skills";
import { meriProcedureOperations } from "./operations/meri-procedures";
import { calendarOperations } from "./operations/calendar";
import { directoryOperations } from "./operations/directory";
import { directoryObjectiveOperations } from "./operations/directory-objective-destination";
import { engagementOperations } from "./operations/engagement";
import { newsletterDeliveryOperations } from "./operations/newsletter-delivery";
import { intelligenceOperations } from "./operations/intelligence";
import { legiwatchOperations } from "./operations/legiwatch";
import { plannerOperations } from "./operations/planner";
import { researchPortfolioOperations } from "./operations/research-portfolios";
import { researchShareOperations } from "./operations/research-share";
import { researchRuleOperations } from "./operations/research-rules";
import { researchImportOperations } from "./operations/research-imports";
import { researchOutputOperations } from "./operations/research-outputs";
import { researchWorkflowOperations } from "./operations/research-workflow";
import { researchDraftOperations } from "./operations/research-drafts";
import { researchComparisonOperations } from "./operations/research-comparisons";
import { defenseResearchOperations } from "./operations/defense-research";
import { defenseProductCoverageOperations } from "./operations/defense-product-coverage";
import { defenseEvidenceOperations } from "./operations/defense-evidence";
import { federalEvidenceOperations } from "./operations/federal-evidence";
import { researchMemberDiscoveryOperations } from "./operations/research-member-discovery";
import { defenseChangesOperations } from "./operations/defense-changes";
import { settingsOperations } from "./operations/settings";
import { settingsAdminOperations } from "./operations/settings-admin";
import { strategiesOperations } from "./operations/strategies";
import { workspaceOperations } from "./operations/workspace";
import { workspaceGenerationOperations } from "./operations/workspace-generation";
import { onboardFunnelOperations } from "./operations/onboard-funnel";
import { onboardSetupOperations } from "./operations/onboard-setup";
import { onboardCoreOperations } from "./operations/onboard-core";
import { objectiveOperationalOperations } from "./operations/objective-operational";
import { objectiveAssociationOperations } from "./operations/objective-associations";
import { governedObjectiveGenerationReadOperation } from "./operations/objective-governed-generation";
import { governedObjectiveOutputsReadOperation } from "./operations/objective-governed-outputs";
import { governedObjectiveStrategyIntakeOperation } from "./operations/objective-governed-strategy-intake";
import {
  firstChatCoreOperation,
  firstChatCoreOperationKey,
  firstChatV2Operation,
  firstChatV2OperationKey,
} from "./operations/meri-first-chat";

// Reviewed feature groups are composed here. This registry is the gateway allowlist.
export const capiroOperations = {
  ...siteWorkflowOperations,
  ...memoryReviewOperations,
  ...memoryGrantOperations,
  ...memoryFilesOperations,
  ...memoryGovernanceOperations,
  ...completedReportOperations,
  ...meriFirmSkillOperations,
  ...meriProcedureOperations,
  ...settingsOperations,
  ...plannerOperations,
  ...engagementOperations,
  ...newsletterDeliveryOperations,
  ...workspaceOperations,
  ...workspaceGenerationOperations,
  ...strategiesOperations,
  ...directoryOperations,
  ...directoryObjectiveOperations,
  ...calendarOperations,
  ...legiwatchOperations,
  ...settingsAdminOperations,
  ...intelligenceOperations,
  ...researchPortfolioOperations,
  ...researchShareOperations,
  ...researchRuleOperations,
  ...researchImportOperations,
  ...researchOutputOperations,
  ...researchWorkflowOperations,
  ...researchDraftOperations,
  ...researchComparisonOperations,
  ...defenseResearchOperations,
  ...defenseProductCoverageOperations,
  ...defenseEvidenceOperations,
  ...federalEvidenceOperations,
  ...researchMemberDiscoveryOperations,
  ...defenseChangesOperations,
  ...onboardFunnelOperations,
  ...onboardSetupOperations,
  ...onboardCoreOperations,
  ...objectiveOperationalOperations,
  ...objectiveAssociationOperations,
  "objectives.governedGeneration.read":
    governedObjectiveGenerationReadOperation,
  "objectives.governedOutputs.read": governedObjectiveOutputsReadOperation,
  "objectives.governedStrategy.intake":
    governedObjectiveStrategyIntakeOperation,
  [firstChatCoreOperationKey]: firstChatCoreOperation,
  [firstChatV2OperationKey]: firstChatV2Operation,
} as const satisfies OperationRegistry;
