import { strategiesAgentOperations } from "./strategies-agents";
import { strategiesContextOperations } from "./strategies-context";
import { strategiesImportOperations } from "./strategies-imports";
import { strategiesPlanOperations } from "./strategies-plan";
import { strategiesReferenceOperations } from "./strategies-reference";
import { strategiesReportOperations } from "./strategies-reports";
import { strategiesWatchOperations } from "./strategies-watch";
export const strategiesOperations = {
  ...strategiesPlanOperations,
  ...strategiesReferenceOperations,
  ...strategiesReportOperations,
  ...strategiesContextOperations,
  ...strategiesImportOperations,
  ...strategiesAgentOperations,
  ...strategiesWatchOperations,
} as const;
