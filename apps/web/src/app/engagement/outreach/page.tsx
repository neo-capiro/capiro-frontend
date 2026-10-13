import { EngagementScreen } from "../../../features/modules/engagement/EngagementScreen";
import { ConnectedModule } from "../../../shared/shell/ConnectedModule";

/** Retain existing rich newsletter handoff links in the canonical application. */
export default function OutreachCompatibilityPage() {
  return (
    <ConnectedModule active="engagement">
      <EngagementScreen />
    </ConnectedModule>
  );
}
