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
import { engagementPlanOperations } from "./operations/engagement-plans";

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
  ...engagementPlanOperations,
} as const satisfies OperationRegistry;
