import type { OperationRegistry } from "./contracts";
import { calendarOperations } from "./operations/calendar";
import { directoryOperations } from "./operations/directory";
import { directoryObjectiveOperations } from "./operations/directory-objective-destination";
import { engagementOperations } from "./operations/engagement";
import { intelligenceOperations } from "./operations/intelligence";
import { legiwatchOperations } from "./operations/legiwatch";
import { plannerOperations } from "./operations/planner";
import { researchPortfolioOperations } from "./operations/research-portfolios";
import { settingsOperations } from "./operations/settings";
import { settingsAdminOperations } from "./operations/settings-admin";
import { strategiesOperations } from "./operations/strategies";
import { workspaceOperations } from "./operations/workspace";
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
  ...settingsOperations,
  ...plannerOperations,
  ...engagementOperations,
  ...workspaceOperations,
  ...strategiesOperations,
  ...directoryOperations,
  ...directoryObjectiveOperations,
  ...calendarOperations,
  ...legiwatchOperations,
  ...settingsAdminOperations,
  ...intelligenceOperations,
  ...researchPortfolioOperations,
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
