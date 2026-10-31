"use client";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useMutation } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { ApiError } from "@/shared/portfolio/api/http";
import { canAdminister, useIdentity } from "@/shared/portfolio/auth/identity";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import type { Meeting } from "../contracts";
import { MeetingTranscriptUpload } from "../library/public";
import { usePreparationCapabilities, useDispatchGuard } from "../access/public";
import {
  cancelDebriefJob,
  debriefBody,
  debriefFailureMessage,
  debriefJobActive,
  debriefRequestKey,
  debriefSaveBody,
  pollDebriefJob,
  readLatestDebriefJob,
  retryDebriefJob,
  startDebriefGeneration,
  type DebriefDraft,
  type DebriefJob,
} from "./api";
import { ManualDebriefSource } from "./ManualDebriefSource";
import { VoiceMemoSource } from "./voice/VoiceMemoSource";
import { SavedMeetingNotesSource } from "../review/public";
type ReviewedDebriefSource = {
  text: string;
  method: "manual" | "upload" | "voice";
};
type DebriefGenerationProps = {
  meeting: Meeting;
  /**
   * D2: the composed body plus the audited context summary of the draft it came
   * from, so the save command can persist what the model was given.
   */
  onDraft: (body: string, generatedFrom?: unknown) => void;
};

export function DebriefGeneration(props: DebriefGenerationProps) {
  const identity = useIdentity();
  // Written source and pending generation belong to one meeting and actor.
  return (
    <SessionDebriefGeneration
      key={`${props.meeting.id}:${identity.data?.tenant?.id}:${identity.data?.user.id}`}
      {...props}
    />
  );
}

function SessionDebriefGeneration({
  meeting,
  onDraft,
}: DebriefGenerationProps) {
  const api = useApi();
  const identity = useIdentity();
  const capabilities = usePreparationCapabilities();
  const guard = useDispatchGuard(
    identity.data?.user.id,
    identity.data?.tenant?.id,
    true,
  );
  const [uploading, setUploading] = useState(false);
  const [manual, setManual] = useState(false);
  const [voice, setVoice] = useState(false);
  const [savedNotes, setSavedNotes] = useState(false);
  const [source, setSource] = useState<ReviewedDebriefSource>();
  // D1: an accepted job survives navigation; its stage is shown instead of the form.
  const [job, setJob] = useState<DebriefJob>();
  const [jobError, setJobError] = useState<string>();
  const [cancelling, setCancelling] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const busy = useRef(false);
  // One key per attempt, kept across retries so a network blip cannot double-generate.
  const requestKey = useRef<string | undefined>(undefined);
  // ...and bound to the exact source it was minted for: an edited source is a distinct
  // attempt and must not silently reuse it.
  const requestKeySource = useRef<ReviewedDebriefSource | undefined>(undefined);
  // Mount recovery is an admission state, not an optimisation: until the saved job state is
  // actually read, this component does not know whether a generation is already running.
  const [recovery, setRecovery] = useState<"checking" | "resolved" | "failed">(
    "checking",
  );
  const [recoveryAttempt, setRecoveryAttempt] = useState(0);
  const lifetime = useRef<AbortController | undefined>(undefined);
  useLayoutEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    return () => controller.abort();
  }, [meeting.id, identity.data?.user.id, identity.data?.tenant?.id]);
  const allowed = Boolean(
    identity.data?.user.id &&
    identity.data.tenant?.id &&
    !identity.isPending &&
    !identity.isFetching &&
    !identity.error &&
    (identity.data.role === "standard_user" ||
      canAdminister(identity.data.role)) &&
    !capabilities.isPending &&
    !capabilities.isFetching &&
    !capabilities.error &&
    capabilities.data?.runtime?.externalActionsEnabled === true,
  );
  // The guard and the admission flag are read at the moment an asynchronous result lands, not
  // captured at the start of it: a permission change during a poll must be honoured.
  const guardRef = useRef(guard);
  guardRef.current = guard;
  const allowedRef = useRef(allowed);
  allowedRef.current = allowed;
  const acceptDraft = useCallback(
    (draft: DebriefDraft) => {
      requestKey.current = undefined;
      requestKeySource.current = undefined;
      setSource(undefined);
      setJob(undefined);
      setJobError(undefined);
      onDraft(debriefBody(draft), debriefSaveBody(draft).generatedFrom);
    },
    [onDraft],
  );
  const mutation = useMutation({
    retry: false,
    mutationFn: async (reviewed: ReviewedDebriefSource) => {
      const scope = lifetime.current;
      if (!allowed || !scope || scope.signal.aborted)
        throw new ApiError(
          403,
          "Debrief generation is unavailable for this session.",
        );
      guard();
      // The key belongs to this attempt of THIS source. A response that never arrived (a
      // transport failure, a 5xx or a malformed success) may still have followed an accepted
      // write, so the retry reconciles the same attempt instead of minting a second job.
      const sameSource =
        requestKeySource.current?.text === reviewed.text &&
        requestKeySource.current?.method === reviewed.method;
      const key =
        requestKey.current && sameSource ? requestKey.current : debriefRequestKey();
      requestKey.current = key;
      requestKeySource.current = reviewed;
      const result = await startDebriefGeneration(
        api,
        meeting.id,
        { sourceText: reviewed.text, method: reviewed.method, requestKey: key },
        scope.signal,
      );
      if (scope.signal.aborted)
        throw new ApiError(409, "This meeting session is no longer active.");
      guard();
      return { result, scope };
    },
    onSuccess: ({ result, scope }) => {
      if (scope.signal.aborted || lifetime.current !== scope) return;
      setJobError(undefined);
      if (result.kind === "draft") {
        acceptDraft(result.draft);
        return;
      }
      setJob(result.job);
    },
    onError: (error) => {
      // Only a SETTLED rejection releases the key (a conflict means it was already used for a
      // different source). An uncertain outcome keeps it, because the write may have landed.
      if (error instanceof ApiError && error.status < 500) {
        requestKey.current = undefined;
        requestKeySource.current = undefined;
      }
    },
    onSettled: () => {
      busy.current = false;
    },
  });
  function generate(reviewed: ReviewedDebriefSource) {
    // Fenced on the recovery state: while the saved job is unknown, a second generation is
    // exactly what must not happen.
    if (busy.current || !allowed || recovery !== "resolved") return false;
    busy.current = true;
    setSource(reviewed);
    setJobError(undefined);
    mutation.mutate(reviewed);
    return true;
  }
  // Poll an accepted job to a terminal state; a cancelled/failed job is an outcome.
  const pollingId = job && debriefJobActive(job) ? job.jobId : undefined;
  // The loop owns the read sequence; it must not restart on every stage update.
  const latestJob = useRef<DebriefJob | undefined>(job);
  useEffect(() => {
    latestJob.current = job;
  }, [job]);
  useEffect(() => {
    const accepted = latestJob.current;
    if (!pollingId || !accepted) return;
    const controller = new AbortController();
    let live = true;
    void pollDebriefJob(api, meeting.id, accepted, {
      signal: controller.signal,
      onStage: (next) => {
        if (live) setJob(next);
      },
    })
      .then((final) => {
        if (!live) return;
        setJob(final);
        if (final.status !== "completed" || !final.draft) return;
        // The completion crossed an asynchronous boundary (polling, a permission change, a
        // parent re-render), so the CURRENT session is re-admitted through the existing
        // dispatch guard before any content is handed to the parent.
        let admitted = allowedRef.current;
        if (admitted) {
          try {
            guardRef.current();
          } catch {
            admitted = false;
          }
        }
        if (admitted) acceptDraft(final.draft);
        else
          setJobError(
            "Your permissions changed while this debrief was generating. The draft is saved with this meeting; reopen it once your access is restored.",
          );
      })
      .catch((error: unknown) => {
        if (!live) return;
        setJobError(
          error instanceof ApiError
            ? error.message
            : "The service could not be reached. The job is saved — reload this meeting to check it.",
        );
      });
    return () => {
      live = false;
      controller.abort();
    };
  }, [api, meeting.id, pollingId, acceptDraft]);
  // Resume after navigation or reload: never present an empty form over a live job, and never
  // admit a new generation until the saved state has actually been read. A failed read is an
  // unknown outcome, not "no job", so generation stays fenced until the lookup settles.
  useEffect(() => {
    if (!allowed) {
      setRecovery("resolved");
      return;
    }
    const scope = lifetime.current;
    let live = true;
    setRecovery("checking");
    void readLatestDebriefJob(api, meeting.id, scope?.signal)
      .then((latest) => {
        if (!live) return;
        if (latest) {
          if (debriefJobActive(latest)) setJob(latest);
          else if (latest.status === "completed" && latest.draft) setJob(latest);
        }
        setRecovery("resolved");
      })
      .catch((error: unknown) => {
        if (!live) return;
        setRecovery("failed");
        setJobError(
          error instanceof ApiError
            ? error.message
            : "The saved generation state could not be read, so a new generation is held. Check again before generating.",
        );
      });
    return () => {
      live = false;
    };
  }, [allowed, api, meeting.id, recoveryAttempt]);
  async function cancel() {
    if (!job || cancelling) return;
    setCancelling(true);
    setJobError(undefined);
    try {
      const next = await cancelDebriefJob(api, meeting.id, job.jobId);
      if (next?.status === "cancelled") {
        requestKey.current = undefined;
        setJob(undefined);
        setSource(undefined);
      } else {
        setJob(next ?? undefined);
      }
    } catch (error) {
      setJobError(
        error instanceof ApiError
          ? error.message
          : "The cancel request could not be confirmed. Reload to check this job.",
      );
    } finally {
      setCancelling(false);
    }
  }
  async function retry() {
    if (!job || retrying) return;
    setRetrying(true);
    setJobError(undefined);
    try {
      const outcome = await retryDebriefJob(api, meeting.id, job);
      if (outcome.kind === "resumed") {
        setJob(outcome.job);
        return;
      }
      // The server will not resume this job. Do not start a second generation here:
      // return to the source form and let the reviewer decide.
      requestKey.current = undefined;
      setJob(undefined);
      setJobError(
        `${debriefFailureMessage(job.errorCode)} Start a new run from the same source.`,
      );
    } catch (error) {
      setJobError(
        error instanceof ApiError
          ? error.message
          : "The retry request could not be confirmed. Reload to check this job.",
      );
    } finally {
      setRetrying(false);
    }
  }
  const readyDraft =
    job?.status === "completed" && job.draft ? job.draft : undefined;
  const failedJob = job?.status === "failed" ? job : undefined;
  // A terminal receipt with no draft (cancelled, or completed without one) is an outcome, not a
  // form: it must be dismissable without another POST.
  const emptyTerminal =
    job && (job.status === "cancelled" || (job.status === "completed" && !job.draft))
      ? job
      : undefined;
  const conflict =
    mutation.error instanceof ApiError && mutation.error.status === 409;
  return (
    <>
      <button
        className="button"
        disabled={
          !allowed ||
          mutation.isPending ||
          Boolean(job) ||
          recovery !== "resolved"
        }
        onClick={() => setSavedNotes(true)}
      >
        Use saved meeting notes
      </button>
      <SavedMeetingNotesSource
        meeting={meeting}
        open={savedNotes}
        onOpenChange={setSavedNotes}
        onGenerate={generate}
      />
      <button
        className="button"
        disabled={
          !allowed ||
          mutation.isPending ||
          Boolean(job) ||
          recovery !== "resolved"
        }
        onClick={() => setUploading(true)}
      >
        Transcript and attachments
      </button>
      <button
        className="button"
        disabled={
          !allowed ||
          mutation.isPending ||
          Boolean(job) ||
          recovery !== "resolved"
        }
        onClick={() => setManual(true)}
      >
        Type Notes Manually
      </button>
      <ManualDebriefSource
        open={manual}
        onOpenChange={setManual}
        allowed={allowed && !mutation.isPending}
        onGenerate={(text) => generate({ text, method: "manual" })}
      />
      <button
        className="button"
        disabled={
          !allowed ||
          mutation.isPending ||
          Boolean(job) ||
          recovery !== "resolved"
        }
        onClick={() => setVoice(true)}
      >
        Record Voice Memo
      </button>
      <VoiceMemoSource
        meeting={meeting}
        open={voice}
        onOpenChange={setVoice}
        onGenerate={generate}
      />
      <QueryState
        error={capabilities.error ?? identity.error}
        retry={() =>
          void (identity.error ? identity.refetch() : capabilities.refetch())
        }
      />
      {recovery === "failed" && (
        <p role="alert">
          The saved generation state could not be read, so a new generation is
          held.{" "}
          <button
            className="button"
            onClick={() => {
              setJobError(undefined);
              setRecoveryAttempt((attempt) => attempt + 1);
            }}
          >
            Check again
          </button>
        </p>
      )}
      {capabilities.isSuccess &&
        !capabilities.data.runtime?.externalActionsEnabled && (
          <small className="muted">
            Source extraction and debrief generation are unavailable in this
            environment.
          </small>
        )}
      <MeetingTranscriptUpload
        meeting={meeting}
        open={uploading}
        onOpenChange={setUploading}
        onExtracted={(reviewed) => generate({ ...reviewed, method: "upload" })}
      />
      <Dialog
        open={Boolean(source) || Boolean(job)}
        onOpenChange={(open) => {
          if (open || mutation.isPending || pollingId || cancelling) return;
          setSource(undefined);
          // A terminal receipt without a draft is dismissed here rather than trapping the form.
          if (emptyTerminal) {
            setJob(undefined);
            setJobError(undefined);
          }
        }}
        title={
          readyDraft
            ? "Generated debrief draft"
            : failedJob
              ? "Debrief generation did not finish"
              : emptyTerminal
                ? "No draft was produced"
                : "Generate meeting debrief"
        }
      >
        {pollingId && (
          <>
            <p role="status" className="muted">
              Progress is saved. You can leave this page and come back.
              {` Current stage: ${job?.stage.replaceAll("_", " ")}.`}
            </p>
            <footer className="row">
              <button
                className="button"
                disabled={cancelling}
                onClick={() => void cancel()}
              >
                Cancel generation
              </button>
            </footer>
          </>
        )}
        {readyDraft && (
          <>
            <p>
              Review the draft before saving it. Generating again from the same
              source does not create a second job.
            </p>
            <footer className="row">
              <button
                className="button"
                disabled={!allowed}
                onClick={() => acceptDraft(readyDraft)}
              >
                Use this draft
              </button>
            </footer>
          </>
        )}
        {failedJob && (
          <>
            <p>{debriefFailureMessage(failedJob.errorCode)}</p>
            <footer className="row">
              <button
                className="button"
                disabled={!allowed || retrying}
                onClick={() => void retry()}
              >
                Try to continue this job
              </button>
              <button
                className="button"
                onClick={() => {
                  setJob(undefined);
                  setJobError(undefined);
                }}
              >
                Back
              </button>
            </footer>
          </>
        )}
        {emptyTerminal && (
          <>
            <p>
              {emptyTerminal.status === "cancelled"
                ? "This generation was cancelled, so no draft was produced."
                : "The service finished this generation without returning a draft. The job is recorded; start a new run from the same source if you still need a draft."}
            </p>
            <footer className="row">
              <button
                className="button"
                onClick={() => {
                  setJob(undefined);
                  setSource(undefined);
                  setJobError(undefined);
                }}
              >
                Close
              </button>
            </footer>
          </>
        )}
        {!job && (
          <>
            <p>
              Generating a draft from the reviewed source. Review and save it
              before approval or sharing.
            </p>
            <QueryState pending={mutation.isPending} error={mutation.error} />
          </>
        )}
        {jobError && <p role="alert">{jobError}</p>}
        {conflict && (
          <p>
            This request was already used for a different source. Start a new
            request to generate from the source shown here.
          </p>
        )}
        {mutation.error && !conflict && !job && (
          <>
            <p>
              Your reviewed source is retained. A failed response may follow a
              completed generation; generating again starts another request.
            </p>
            <button
              className="button"
              disabled={!allowed || mutation.isPending}
              onClick={() => {
                if (source) generate(source);
              }}
            >
              Generate again from this source
            </button>
          </>
        )}
      </Dialog>
    </>
  );
}
