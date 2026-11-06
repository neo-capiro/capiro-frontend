"use client";
import { LegiWatchHeader, LegiWatchTabs } from "./components";
import { HearingDetailScreen } from "./hearings/HearingDetailScreen";
import { HearingsScreen } from "./hearings/HearingsScreen";
import styles from "./legiwatch.module.css";
import { BrowserRoom } from "./live/BrowserRoom";
import { moreCatalog } from "./more/more-catalog";
import { MoreScreen } from "./more/MoreScreen";
import { PublicationWorkspace } from "./publications/PublicationWorkspace";
import { UpdatesScreen } from "./updates/UpdatesScreen";
import { useLegiWatchRoute } from "./use-legiwatch-route";
import { BillTrackerScreen } from "./BillTrackerScreen";
import type { TrackerRuntime } from "@/shared/portfolio/config/config";

const tabs = [
  { id: "bills", label: "Bill tracker" },
  { id: "hearings", label: "Live hearings" },
  { id: "updates", label: "Updates" },
  { id: "more", label: "More" },
] as const;
export function LegiWatchScreen({
  trackerConfig,
}: {
  trackerConfig?: TrackerRuntime;
}) {
  const route = useLegiWatchRoute();
  const more = moreCatalog.find((item) => item.id === route.moreView);
  const publicationSessionId = route.search.get("publicationSessionId");
  if (route.movedCommitteeHref) return null;
  if (publicationSessionId)
    return (
      <div className={styles.screen}>
        <LegiWatchHeader title="Reviewed hearing publications" />
        <LegiWatchTabs
          value="hearings"
          items={tabs}
          onChange={(value) =>
            route.navigate({
              lw: value,
              hearingId: null,
              sessionId: null,
              publicationSessionId: null,
              lwMore: null,
            })
          }
        />
        <PublicationWorkspace
          key={publicationSessionId}
          sessionId={publicationSessionId}
        />
      </div>
    );
  const title = route.sessionId
    ? "Browser hearing room"
    : route.hearingId
      ? "Hearing detail"
      : route.section === "updates"
        ? "Updates"
        : route.section === "more"
          ? (moreCatalog.find((item) => item.id === route.moreView)?.title ??
            "More LegiWatch")
          : route.section === "bills"
            ? "Bill tracker"
            : "Live hearings";
  return (
    <div className={styles.screen} data-figma-node="411:123078">
      <LegiWatchHeader
        title={title}
        description={
          route.hearingId || route.sessionId
            ? undefined
            : route.section === "more"
              ? more?.description
              : route.section === "bills"
                ? "Track bills across your clients and review what each bill could mean for them."
                : "Discover federal and Florida proceedings. Follow updates or open a hearing to attend."
        }
      />
      <LegiWatchTabs
        value={route.section}
        items={tabs}
        onChange={(value) =>
          route.navigate({
            lw: value,
            hearingId: null,
            sessionId: null,
            publicationSessionId: null,
            lwMore: null,
          })
        }
      />
      {route.sessionId ? (
        <BrowserRoom sessionId={route.sessionId} />
      ) : route.hearingId ? (
        <HearingDetailScreen hearingId={route.hearingId} />
      ) : route.section === "bills" ? (
        <BillTrackerScreen config={trackerConfig} />
      ) : route.section === "hearings" ? (
        <HearingsScreen />
      ) : route.section === "updates" ? (
        <UpdatesScreen />
      ) : (
        <MoreScreen />
      )}
    </div>
  );
}
