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

/** Public composition boundary; each module owns its screens and state. */
export function ModuleScreen({ module }: { module: ModuleSlug }) {
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
      return <IntelligenceScreen />;
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
          <WorkspaceScreen />
        </ObjectiveDestinationRoute>
      );
  }
}
