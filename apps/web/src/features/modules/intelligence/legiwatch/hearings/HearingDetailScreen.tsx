"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { committeeDirectoryHref } from "../../../directory/public";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  StatusPanel,
} from "../../../../../shared/module-ui";
import {
  LegiWatchTabs,
  SourceLink,
  downloadText,
  hearingDate,
} from "../components";
import styles from "../legiwatch.module.css";
import { useLegiWatchRoute } from "../use-legiwatch-route";
import { AttendanceDialog } from "./AttendanceDialog";
import { displayTime } from "./calendar-dates";
import { FollowHearingDialog } from "./FollowHearingDialog";
import { HearingWorkDialog } from "./HearingWorkDialog";
import { IntelligencePanel } from "./IntelligencePanel";
import { TranscriptPanel } from "./TranscriptPanel";
import { OfficialHearingPlayer } from "./OfficialHearingPlayer";

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "live", label: "Watch & Capture" },
  { id: "transcript", label: "Transcript" },
  { id: "intelligence", label: "Intelligence" },
  { id: "relevance", label: "Client relevance" },
  { id: "sources", label: "Sources & Documents" },
];
export function HearingDetailScreen({ hearingId }: { hearingId: string }) {
  const router = useRouter();
  const route = useLegiWatchRoute(),
    [followOpen, setFollowOpen] = useState(false),
    [attendanceOpen, setAttendanceOpen] = useState(false),
    [work, setWork] = useState<string | null>(null),
    [error, setError] = useState("");
  const tab = route.search.get("hearingTab") ?? "overview";
  const setTab = (value: string) => route.navigate({ hearingTab: value });
  const detail = useCapiroQuery("legiwatch.hearing", {
    params: { id: hearingId },
    query: { clientId: route.clientId || undefined },
  });
  const exportCalendar = useCapiroMutation("legiwatch.calendarExport");
  const room = useCapiroQuery("legiwatch.room", { params: { id: hearingId } });
  const sourceUrl =
    room.data?.event.officialPlaybackUrl ??
    detail.data?.hearing.officialPageUrl;
  const review = useCapiroMutation("legiwatch.publicReview.open");
  async function openReview() {
    try {
      const result = await review.run({
        params: { id: hearingId },
        body: { kind: "hearing_recap" },
      });
      route.navigate({ publicationSessionId: result.sessionId });
    } catch {
      /* Exact backend error displayed below. */
    }
  }
  const download = async () => {
    setError("");
    try {
      const result = await exportCalendar.run({ params: { id: hearingId } });
      downloadText(result.ics, result.filename, "text/calendar;charset=utf-8");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Export failed.");
    }
  };
  return (
    <StatusPanel
      loading={detail.loading}
      error={detail.error}
      onRetry={detail.reload}
    >
      {detail.data && (
        <div className={styles.screen} data-figma-node="1064:263495">
          <h1 className={styles.header}>{detail.data.hearing.title}</h1>
          <p className={styles.description}>
            {detail.data.hearing.committeeName} · {detail.data.hearing.chamber}
          </p>
          <div className={styles.actions}>
            <ActionButton onClick={() => route.navigate({ hearingId: null })}>
              Back to hearings
            </ActionButton>
            <ActionButton
              disabled={!detail.data.hearing.committeeSystemCode}
              onClick={() =>
                router.push(
                  committeeDirectoryHref(
                    detail.data!.hearing.committeeSystemCode!,
                    route.clientId,
                  ),
                )
              }
            >
              Open committee
            </ActionButton>
            <ActionButton onClick={() => setFollowOpen(true)}>
              {detail.data.followState.following ? "Edit follow" : "Follow"}
            </ActionButton>
            <ActionButton primary onClick={() => setAttendanceOpen(true)}>
              Attend & capture
            </ActionButton>
            <ActionButton onClick={() => setTab("live")}>
              Watch / replay hearing
            </ActionButton>
            <Badge>{detail.data.hearing.visibility} hearing</Badge>
          </div>
          <LegiWatchTabs
            value={tab}
            items={tabs}
            onChange={setTab}
            label="Hearing detail sections"
          />
          {tab === "overview" ? (
            <>
              <div className={styles.stats}>
                <div className={styles.stat}>
                  <span>Official date</span>
                  <strong>
                    {hearingDate(
                      detail.data.hearing.calendarDate,
                      detail.data.hearing.scheduledStart,
                    )}
                  </strong>
                </div>
                <div className={styles.stat}>
                  <span>Starts at</span>
                  <strong>
                    {displayTime(
                      detail.data.hearing.scheduledStart,
                      detail.data.hearing.time,
                    )}{" "}
                    ET
                  </strong>
                </div>
                <div className={styles.stat}>
                  <span>Access</span>
                  <strong>{detail.data.hearing.visibility}</strong>
                </div>
                <div className={styles.stat}>
                  <span>Status</span>
                  <strong>
                    {detail.data.hearing.eventStatus.replaceAll("_", " ")}
                  </strong>
                </div>
              </div>
              <div className={styles.grid}>
                <section className={styles.card}>
                  <h2>Agenda and preparation</h2>
                  {detail.data.hearing.witnesses.length ? (
                    <ul>
                      {detail.data.hearing.witnesses.map((witness) => (
                        <li key={witness}>{witness}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className={styles.description}>
                      Witness information has not been published by the source.
                    </p>
                  )}
                  <ActionButton primary onClick={() => setWork("preparation")}>
                    Create prep draft
                  </ActionButton>
                  <SourceLink href={detail.data.hearing.officialPageUrl}>
                    View official agenda
                  </SourceLink>
                </section>
                <section className={styles.card}>
                  <Badge>
                    {detail.data.attendanceState.state.replaceAll("_", " ")}
                  </Badge>
                  <p>
                    {detail.data.hearing.location || "Location not announced"}
                  </p>
                  <p className={styles.description}>
                    {detail.data.attendanceState.message}
                  </p>
                  <SourceLink href={sourceUrl}>
                    Open official Watch / Replay
                  </SourceLink>
                  <ActionButton onClick={() => setAttendanceOpen(true)}>
                    Attendance & capture
                  </ActionButton>
                </section>
              </div>
              <section className={styles.card}>
                <h2>Work with this hearing</h2>
                <div className={styles.actions}>
                  <ActionButton onClick={() => setWork("brief")}>
                    Create brief
                  </ActionButton>
                  <ActionButton
                    disabled={review.pending}
                    onClick={() => void openReview()}
                  >
                    Create reviewed hearing update
                  </ActionButton>
                  <ActionButton onClick={() => setWork("save")}>
                    Save to client
                  </ActionButton>
                  <ActionButton onClick={() => setWork("outreach")}>
                    Stage outreach
                  </ActionButton>
                  <ActionButton
                    disabled={exportCalendar.pending}
                    onClick={download}
                  >
                    Export calendar
                  </ActionButton>
                </div>
              </section>
              <div className={styles.banner}>
                <strong>Source-linked work</strong>Choose a client before saving
                or staging an action. Outreach opens a draft in Engagement;
                nothing is sent automatically.
              </div>
            </>
          ) : tab === "transcript" ? (
            <TranscriptPanel hearingId={hearingId} />
          ) : tab === "live" ? (
            <>
              <OfficialHearingPlayer
                sourceUrl={sourceUrl}
                listing={
                  room.data?.event.officialPlaybackKind ===
                  "official_listing_page"
                }
              />
              {room.error && (
                <p role="status">
                  The current player link could not be checked. The official
                  hearing page remains available.
                </p>
              )}
              <section className={styles.card}>
                <h2>Capture status</h2>
                <Badge>
                  {detail.data.attendanceState.state.replaceAll("_", " ")}
                </Badge>
                <p>{detail.data.attendanceState.message}</p>
                <ActionButton onClick={() => setAttendanceOpen(true)}>
                  Manage attendance
                </ActionButton>
              </section>
              <TranscriptPanel
                hearingId={hearingId}
                live={detail.data.attendanceState.state === "CAPTURING"}
              />
            </>
          ) : tab === "intelligence" || tab === "relevance" ? (
            <IntelligencePanel
              hearingId={hearingId}
              relevantOnly={tab === "relevance"}
            />
          ) : (
            <section className={styles.card}>
              <h2>Sources & Documents</h2>
              <SourceLink href={detail.data.hearing.officialPageUrl}>
                Official hearing page
              </SourceLink>
              {detail.data.sources.map((source, index) => (
                <article className={styles.listItem} key={source.id ?? index}>
                  <strong>
                    {source.title ||
                      source.label ||
                      source.kind ||
                      "Official document"}
                  </strong>
                  <SourceLink href={source.sourceUrl ?? source.url}>
                    Open retained source
                  </SourceLink>
                </article>
              ))}
              {!detail.data.sources.length && (
                <p className={styles.description}>
                  No published source documents have been retained for this
                  hearing.
                </p>
              )}
            </section>
          )}
          {review.error && (
            <p role="alert" className={styles.error}>
              {review.error.message}
            </p>
          )}
          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}
          <FollowHearingDialog
            hearingId={hearingId}
            open={followOpen}
            onClose={() => setFollowOpen(false)}
            onSaved={detail.reload}
          />
          <AttendanceDialog
            hearingId={hearingId}
            open={attendanceOpen}
            onClose={() => setAttendanceOpen(false)}
            onSaved={detail.reload}
            sourceUrl={sourceUrl}
          />
          <HearingWorkDialog
            hearingId={hearingId}
            mode={work}
            onClose={() => setWork(null)}
          />
        </div>
      )}
    </StatusPanel>
  );
}
