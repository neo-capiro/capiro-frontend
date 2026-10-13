import type { OperationRegistry } from "./contracts";
import { calendarOperations } from "./operations/calendar";
import { directoryOperations } from "./operations/directory";
import { engagementOperations } from "./operations/engagement";
import { intelligenceOperations } from "./operations/intelligence";
import { legiwatchOperations } from "./operations/legiwatch";
import { plannerOperations } from "./operations/planner";
import { researchPortfolioOperations } from "./operations/research-portfolios";
import { settingsOperations } from "./operations/settings";
import { settingsAdminOperations } from "./operations/settings-admin";
import { strategiesOperations } from "./operations/strategies";
import { workspaceOperations } from "./operations/workspace";

// Reviewed feature groups are composed here. This registry is the gateway allowlist.
export const capiroOperations = {
  ...settingsOperations,
  ...plannerOperations,
  ...engagementOperations,
  ...workspaceOperations,
  ...strategiesOperations,
  ...directoryOperations,
  ...calendarOperations,
  ...legiwatchOperations,
  ...settingsAdminOperations,
  ...intelligenceOperations,
  ...researchPortfolioOperations,
} as const satisfies OperationRegistry;
