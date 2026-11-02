"use client";
import { useEffect, useState } from "react";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  Modal,
  StatusPanel,
  TextArea,
} from "../../../../../shared/module-ui";
import { timecode } from "../components";
import { OfficialHearingPlayer } from "../hearings/OfficialHearingPlayer";
import { AttendanceDialog } from "../hearings/AttendanceDialog";
import styles from "../legiwatch.module.css";
import { useLegiWatchRoute } from "../use-legiwatch-route";
import { RetainedAudioPanel } from "./RetainedAudioPanel";
import { useBrowserCapture } from "./use-browser-capture";

export function BrowserRoom({ sessionId }: { sessionId: string }) {
  const query = useCapiroQuery("legiwatch.session", {
    params: { id: sessionId },
  });
  return (
    <StatusPanel
      loading={query.loading}
      error={query.error}
      onRetry={query.reload}
    >
      {query.data && (
        <ConnectedBrowserRoom
          key={sessionId}
          session={query.data}
          reload={query.reload}
        />
      )}
    </StatusPanel>
  );
}
function ConnectedBrowserRoom({
  session,
  reload,
}: {
  session: NonNullable<
    ReturnType<typeof useCapiroQuery<"legiwatch.session">>["data"]
  >;
  reload: () => void;
}) {
  const route = useLegiWatchRoute(),
    capture = useBrowserCapture(session.id, session.recordingPolicy, reload);
  const [consent, setConsent] = useState(false),
    [transcriptOnly, setTranscriptOnly] = useState(false),
    [attestation, setAttestation] = useState(""),
    [attendance, setAttendance] = useState(false),
    [offset, setOffset] = useState(0);
  const confirm = useCapiroMutation("legiwatch.session.consent");
  const history = useCapiroQuery("legiwatch.session.transcript", {
    params: { id: session.id },
    query: { offset, limit: 250 },
  });
  const consentReady =
    session.consentStatus === "confirmed" ||
    session.consentStatus === "not_required";
  useEffect(() => {
    if (!capture.active) return;
    const handle = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handle);
    return () => window.removeEventListener("beforeunload", handle);
  }, [capture.active]);
  async function saveConsent() {
    try {
      await confirm.run({ params: { id: session.id }, body: { attestation } });
      setConsent(false);
      reload();
    } catch {
      /* The mutation renders its verified error. */
    }
  }
  return (
    <>
      <h2 className={styles.roomTitle}>{session.title}</h2>
      <ActionButton
        disabled={capture.active}
        onClick={() => route.navigate({ publicationSessionId: session.id })}
      >
        Create reviewed hearing update
      </ActionButton>
      <div className={styles.actions}>
        <Badge tone={capture.phase === "capturing" ? "success" : "neutral"}>
          {capture.phase === "capturing" ? (
            <>
              <span className={styles.liveDot} />
              Capturing
            </>
          ) : (
            capture.phase.replaceAll("_", " ")
          )}
        </Badge>
        <Badge>{session.consentStatus}</Badge>
        {capture.active && (
          <ActionButton
            disabled={capture.phase !== "capturing"}
            onClick={() => void capture.stop()}
          >
            {capture.phase === "stopping"
              ? "Confirming final audio…"
              : "Stop capture"}
          </ActionButton>
        )}
        {session.hearingId && (
          <ActionButton onClick={() => setAttendance(true)}>
            Manage server attendance
          </ActionButton>
        )}
        <ActionButton
          disabled={capture.active}
          onClick={() =>
            route.navigate({
              sessionId: null,
              hearingId: session.hearingId ?? null,
            })
          }
        >
          Back to hearing
        </ActionButton>
      </div>
      {capture.error && (
        <p className={styles.error} role="alert">
          {capture.error}
        </p>
      )}
      <div className={styles.room}>
        <section className={styles.card}>
          <OfficialHearingPlayer sourceUrl={session.sourceUrl} />
          {capture.segments.length > 0 && (
            <div className={styles.transcript}>
              {capture.segments.map((segment) => (
                <article className={styles.segment} key={segment.id}>
                  <span className={styles.timecode}>
                    {timecode(segment.startMs)}
                  </span>
                  <div>
                    <strong>
                      {segment.speakerLabel ?? "Speaker not identified"}
                    </strong>
                    <p>{segment.text}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
          {capture.interim && (
            <article className={styles.listItem}>
              <Badge>Interim</Badge>
              <p>{capture.interim.text}</p>
            </article>
          )}
        </section>
        <div className={styles.list}>
          <RetainedAudioPanel
            sessionId={session.id}
            capturing={capture.active}
            onPolicyChanged={reload}
          />
          <section className={styles.card}>
            <Badge>
              {capture.active ? "Browser tab capture" : "Not connected"}
            </Badge>
            <ol>
              <li>Open and play the official source tab.</li>
              <li>Connect this room.</li>
              <li>Choose that browser tab and share tab audio.</li>
              <li>
                Transcription starts only after the server confirms capture
                ready.
              </li>
            </ol>
            {session.recordingPolicy === "transcript_only" ? (
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={transcriptOnly}
                  disabled={capture.active}
                  onChange={(event) => setTranscriptOnly(event.target.checked)}
                />
                Continue with transcript only. Audio will not be saved for
                replay.
              </label>
            ) : (
              <p>
                Audio and transcript will be retained according to the available
                recording policy.
              </p>
            )}
            <ActionButton
              primary
              disabled={
                capture.active ||
                !consentReady ||
                (session.recordingPolicy === "transcript_only" &&
                  !transcriptOnly)
              }
              onClick={() => void capture.connect()}
            >
              {capture.active
                ? "Capture in progress"
                : "Connect and share tab audio"}
            </ActionButton>
            <ActionButton
              disabled={capture.active}
              onClick={() => setConsent(true)}
            >
              Review consent
            </ActionButton>
            <p className={styles.description}>
              This browser tab and device must remain awake. A saved room has
              not started recording. Leaving this room stops capture and
              finishes the current save; closing the browser can interrupt the
              final save.
            </p>
          </section>
          {capture.active && (
            <section className={styles.card}>
              <p>
                Audio sent · {(capture.bytesSent / 1024 / 1024).toFixed(2)} MB
              </p>
              <p>
                Saved audio ·{" "}
                {capture.saved
                  ? `${timecode(capture.saved.durableEndMs)} · ${(capture.saved.durableBytes / 1024 / 1024).toFixed(2)} MB`
                  : session.recordingPolicy === "transcript_only"
                    ? "Not retained"
                    : "No durable acknowledgement yet"}
              </p>
              <p className={styles.description}>
                Coverage is partial until final audio is confirmed.
              </p>
            </section>
          )}
          {capture.cards.map((card) => (
            <article key={card.id} className={styles.card}>
              <Badge>{card.cardType} · Preliminary</Badge>
              <strong>{card.title}</strong>
              <p>{card.body}</p>
              {card.startMs !== undefined && (
                <span className={styles.timecode}>
                  {timecode(card.startMs)}
                </span>
              )}
            </article>
          ))}
        </div>
      </div>
      <div className={styles.banner}>
        <strong>Independent server attendance</strong>Server attendance may run
        independently from this browser session. Sharing a tab creates browser
        capture only.
      </div>
      <section className={styles.card}>
        <div className={styles.row}>
          <h2>Saved transcript</h2>
          <ActionButton onClick={history.reload}>
            Refresh transcript
          </ActionButton>
        </div>
        <StatusPanel
          loading={history.loading}
          error={history.error}
          onRetry={history.reload}
          empty={
            history.data?.items.length === 0
              ? "No saved transcript segments."
              : undefined
          }
        >
          <div className={styles.transcript}>
            {history.data?.items.map((segment) => (
              <article className={styles.segment} key={segment.id}>
                <span className={styles.timecode}>
                  {timecode(segment.startMs)}
                </span>
                <div>
                  <strong>
                    {segment.resolvedSpeakerName ??
                      segment.speakerLabel ??
                      "Speaker not identified"}
                  </strong>
                  <p>{segment.text}</p>
                  {segment.confidence !== undefined &&
                    segment.confidence < 0.8 && (
                      <p className={styles.description}>
                        Low confidence · Verify before quoting
                      </p>
                    )}
                </div>
              </article>
            ))}
          </div>
          <div className={styles.actions}>
            <ActionButton
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - 250))}
            >
              Previous
            </ActionButton>
            <ActionButton
              disabled={
                !history.data?.hasMore || history.data.nextOffset === null
              }
              onClick={() => setOffset(history.data!.nextOffset!)}
            >
              Next
            </ActionButton>
          </div>
        </StatusPanel>
      </section>
      <Modal
        open={consent}
        onOpenChange={setConsent}
        title="Capture consent"
        description="Your session source type determines whether an attestation is required. Backend authorization is checked again before capture."
        footer={
          <>
            <ActionButton onClick={() => setConsent(false)}>Close</ActionButton>
            {session.consentStatus !== "not_required" && (
              <ActionButton
                primary
                disabled={!attestation.trim() || confirm.pending}
                onClick={() => void saveConsent()}
              >
                Confirm authorization
              </ActionButton>
            )}
          </>
        }
      >
        <p>
          {session.consentStatus === "not_required"
            ? "Public hearing or markup: consent is not required for this session source type."
            : "Confirm that you are authorized to capture this private session. The full attestation is retained."}
        </p>
        {session.consentStatus !== "not_required" && (
          <TextArea
            value={attestation}
            maxLength={2000}
            onChange={(event) => setAttestation(event.target.value)}
            aria-label="Capture authorization attestation"
          />
        )}
        {confirm.error && (
          <p role="alert" className={styles.error}>
            {confirm.error.message}
          </p>
        )}
      </Modal>
      {session.hearingId && (
        <AttendanceDialog
          hearingId={session.hearingId}
          sourceUrl={session.sourceUrl}
          open={attendance}
          onClose={() => setAttendance(false)}
          onSaved={reload}
        />
      )}
    </>
  );
}
