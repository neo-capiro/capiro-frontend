import type { ModuleSlug } from "../../shared/shell/module-catalog";
import { CalendarScreen } from "./calendar/CalendarScreen";
import { DirectoryScreen } from "./directory/DirectoryScreen";
import { EngagementScreen } from "./engagement/EngagementScreen";
import { IntelligenceScreen } from "./intelligence/IntelligenceScreen";
import { PlannerScreen } from "./planner/PlannerScreen";
import { ResearchPortfoliosScreen } from "./research-portfolios/ResearchPortfoliosScreen";
import { StrategiesScreen } from "./strategies/StrategiesScreen";
import { WorkspaceScreen } from "./workspace/WorkspaceScreen";

/** Public composition boundary; each module owns its screens and state. */
export function ModuleScreen({ module }: { module: ModuleSlug }) {
  switch (module) {
    case "calendar":
      return <CalendarScreen />;
    case "directory":
      return <DirectoryScreen />;
    case "engagement":
      return <EngagementScreen />;
    case "intelligence":
      return <IntelligenceScreen />;
    case "planner":
      return <PlannerScreen />;
    case "research-portfolios":
      return <ResearchPortfoliosScreen />;
    case "strategies":
      return <StrategiesScreen />;
    case "workspace":
      return <WorkspaceScreen />;
  }
}
