import { LegiWatchScreen } from "@/features/modules/intelligence/legiwatch/LegiWatchScreen";
import { ConnectedModule } from "@/shared/shell/ConnectedModule";
import { readConfig } from "@/shared/portfolio/config/config";

export default function LegiWatchPage() {
  const tracker = readConfig(process.env);
  return (
    <ConnectedModule active="intelligence">
      <LegiWatchScreen
        trackerConfig={{
          trackerBackend: tracker.trackerBackend,
          trackerMetricsVersion: tracker.trackerMetricsVersion,
          destinations: tracker.destinations,
        }}
      />
    </ConnectedModule>
  );
}
