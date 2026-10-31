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
  onDraft: (body: string) => void;
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
  const acceptDraft = useCallback(
    (draft: DebriefDraft) => {
      requestKey.current = undefined;
      setSource(undefined);
      setJob(undefined);
      setJobError(undefined);
      onDraft(debriefBody(draft));
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
      const key = requestKey.current ?? debriefRequestKey();
      requestKey.current = key;
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
      // The key is bound to the source it was accepted with; a new attempt after a
      // conflict or a failed send must not reuse it.
      if (
        error instanceof ApiError &&
        (error.status === 409 || error.status >= 500)
      )
        requestKey.current = undefined;
    },
    onSettled: () => {
      busy.current = false;
    },
  });
  function generate(reviewed: ReviewedDebriefSource) {
    if (busy.current || !allowed) return false;
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
        if (final.status === "completed" && final.draft)
          acceptDraft(final.draft);
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
  // Resume after navigation or reload: never present an empty form over a live job.
  useEffect(() => {
    if (!allowed) return;
    const scope = lifetime.current;
    let live = true;
    void readLatestDebriefJob(api, meeting.id, scope?.signal)
      .then((latest) => {
        if (!live || !latest) return;
        if (debriefJobActive(latest)) setJob(latest);
        else if (latest.status === "completed" && latest.draft) setJob(latest);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [allowed, api, meeting.id]);
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
  const conflict =
    mutation.error instanceof ApiError && mutation.error.status === 409;
  return (
    <>
      <button
        className="button"
        disabled={!allowed || mutation.isPending || Boolean(job)}
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
        disabled={!allowed || mutation.isPending || Boolean(job)}
        onClick={() => setUploading(true)}
      >
        Transcript and attachments
      </button>
      <button
        className="button"
        disabled={!allowed || mutation.isPending || Boolean(job)}
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
        disabled={!allowed || mutation.isPending || Boolean(job)}
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
          if (!open && !mutation.isPending && !pollingId && !cancelling)
            setSource(undefined);
        }}
        title={
          readyDraft
            ? "Generated debrief draft"
            : failedJob
              ? "Debrief generation did not finish"
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
