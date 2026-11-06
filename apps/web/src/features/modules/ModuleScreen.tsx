import type { ModuleSlug } from "../../shared/shell/module-catalog";
import { DirectoryScreen } from "./directory/DirectoryScreen";
import { ObjectiveDirectoryDestination } from "./directory/ObjectiveDirectoryDestination";
import { EngagementScreen } from "./engagement/EngagementScreen";
import { IntelligenceScreen } from "./intelligence/IntelligenceScreen";
import { PlannerScreen } from "./planner/PlannerScreen";
import { ResearchPortfoliosScreen } from "./research-portfolios/ResearchPortfoliosScreen";
import { StrategiesScreen } from "./strategies/StrategiesScreen";
import { WorkspaceScreen } from "./workspace/WorkspaceScreen";
import { ObjectiveDestinationRoute } from "./objective-destinations/ObjectiveDestinationRoute";
import type { TrackerRuntime } from "@/shared/portfolio/config/config";

/** Public composition boundary; each module owns its screens and state. */
export function ModuleScreen({
  module,
  officeEnabled = false,
  documentOperation = null,
  trackerConfig,
}: {
  module: ModuleSlug;
  /** Server-decided (readOfficeConfig); only the Workspace reads it. */
  officeEnabled?: boolean;
  /** Server-decided (readDocumentConfig); the Files editor's document family, only the Workspace reads it. */
  documentOperation?: "create_word" | "create_excel" | null;
  trackerConfig?: TrackerRuntime;
}) {
  switch (module) {
    case "directory":
      return (
        <ObjectiveDirectoryDestination>
          <DirectoryScreen />
        </ObjectiveDirectoryDestination>
      );
    case "engagement":
      return <EngagementScreen />;
    case "intelligence":
      return <IntelligenceScreen trackerConfig={trackerConfig} />;
    case "planner":
      return (
        <ObjectiveDestinationRoute kind="planner_task">
          <PlannerScreen />
        </ObjectiveDestinationRoute>
      );
    case "research-portfolios":
      return <ResearchPortfoliosScreen />;
    case "strategies":
      return (
        <ObjectiveDestinationRoute kind="strategy">
          <StrategiesScreen />
        </ObjectiveDestinationRoute>
      );
    case "workspace":
      return (
        <ObjectiveDestinationRoute kind="workspace_saved_revision">
          <WorkspaceScreen
            officeEnabled={officeEnabled}
            documentOperation={documentOperation}
          />
        </ObjectiveDestinationRoute>
      );
  }
}
