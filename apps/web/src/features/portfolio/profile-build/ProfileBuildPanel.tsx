"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { UploadDialog } from "@/features/portfolio/files/public";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import type { ResearchInput } from "./research-contracts";
import type { ProfileSubject } from "./subject";
import { canSelectFinding, type ProfileBuildRun } from "./contracts";
import {
  useLatestReview,
  useProfileBuildAccess,
  useProfileBuildSetup,
  isProfileAccessDenied,
} from "./queries";
import { useResearchCommands } from "./useResearchCommands";
import { useReviewAction } from "./useReviewAction";
import type { ReviewAction } from "./actions";
import { ResearchRequest } from "./ResearchRequest";
import { ResearchFeedback } from "./ResearchFeedback";
import { ReviewFeedback } from "./ReviewFeedback";
import { RunLedger } from "./RunLedger";
import { FindingReview } from "./FindingReview";
import { ReviewConfirmation } from "./ReviewConfirmation";
import styles from "./profile-build.module.css";

export function ProfileBuildPanel({
  subject,
  initialResearch,
  businessUnitId,
  purpose,
  capabilityId,
  onInitialResearchPendingChange,
}: {
  subject: ProfileSubject;
  initialResearch?: ResearchInput;
  businessUnitId?: string;
  purpose?: ResearchInput["purpose"];
  capabilityId?: string;
  onInitialResearchPendingChange?: (pending: boolean) => void;
}) {
  const access = useProfileBuildAccess();
  return (
    <CurrentProfileBuild
      key={`${subject.kind}:${subject.id}:${access.identity.data?.tenant?.id}:${access.identity.data?.user.id}:${businessUnitId ?? ""}:${purpose ?? ""}:${capabilityId ?? ""}`}
      subject={subject}
      access={access}
      initialResearch={initialResearch}
      businessUnitId={businessUnitId}
      purpose={purpose}
      capabilityId={capabilityId}
      onInitialResearchPendingChange={onInitialResearchPendingChange}
    />
  );
}

function CurrentProfileBuild({
  subject,
  access,
  initialResearch,
  businessUnitId,
  purpose,
  capabilityId,
  onInitialResearchPendingChange,
}: {
  initialResearch?: ResearchInput;
  businessUnitId?: string;
  purpose?: ResearchInput["purpose"];
  capabilityId?: string;
  onInitialResearchPendingChange?: (pending: boolean) => void;
  subject: ProfileSubject;
  access: ReturnType<typeof useProfileBuildAccess>;
}) {
  const { identity, canRead, canEdit } = access;
  const actor = {
    userId: identity.data?.user.id ?? "",
    tenantId: identity.data?.tenant?.id ?? "",
  };
  const latest = useLatestReview(subject, canRead);
  const setup = useProfileBuildSetup(subject, canRead);
  const research = useResearchCommands(subject, actor, true, canRead);
  const action = useReviewAction(subject, true, actor, canRead);
  const denied = [
    action.mutation.error,
    action.recovery.error,
    research.error,
    setup.error,
  ].find(isProfileAccessDenied);
  const [showRequest, setShowRequest] = useState(Boolean(purpose));
  const [upload, setUpload] = useState(false);
  const started = useRef(false);
  // The intake host must not navigate away while its automatic start still
  // exists only in this mounted view. A confirmed run or retained recovery
  // command can travel through the existing profile/recovery owners. Settled
  // read failures also leave deliberate navigation available for recovery.
  const initialResearchPending = Boolean(
    initialResearch &&
    !latest.data &&
    (research.busy ||
      latest.isFetching ||
      setup.isFetching ||
      research.retained.loading ||
      (!latest.error &&
        !setup.error &&
        !research.error &&
        !research.retained.error &&
        !research.mutation.isSuccess &&
        !research.retained.record)),
  );
  useLayoutEffect(() => {
    onInitialResearchPendingChange?.(initialResearchPending);
  }, [initialResearchPending, onInitialResearchPendingChange]);
  useEffect(() => {
    if (
      !initialResearch ||
      started.current ||
      !canRead ||
      denied ||
      latest.isPending ||
      latest.error ||
      research.busy ||
      research.blocked
    )
      return;
    started.current = true;
    if (!latest.data)
      research.mutation.mutate({
        kind: "start",
        input: {
          ...initialResearch,
          ...(businessUnitId ? { businessUnitId } : {}),
          ...(purpose ? { purpose } : {}),
          ...(capabilityId ? { capabilityId } : {}),
        },
      });
  }, [
    initialResearch,
    businessUnitId,
    purpose,
    capabilityId,
    canRead,
    denied,
    latest.isPending,
    latest.error,
    latest.data,
    research,
  ]);
  const [confirm, setConfirm] = useState<{
    run: ProfileBuildRun;
    action: ReviewAction;
  }>();
  const reviewAccessible =
    canRead &&
    latest.isSuccess &&
    !latest.error &&
    !action.readError &&
    !denied;
  const run = reviewAccessible
    ? action.uncertain
      ? action.uncertainReview
      : latest.data
    : undefined;
  const busy =
    action.mutation.isPending ||
    action.recovery.isPending ||
    action.checkingRecovery ||
    action.uncertain ||
    research.busy ||
    research.blocked ||
    latest.isFetching;
  const request = (next: ReviewAction) => {
    if (run) setConfirm({ run, action: next });
  };
  return (
    <section
      id="profile-research"
      className={styles.panel}
      aria-label="Profile research"
    >
      {upload && reviewAccessible && subject.kind === "client" && (
        <UploadDialog clientId={subject.id} onClose={() => setUpload(false)} />
      )}
      <header className="row between">
        <div>
          <p className="eyebrow">Sourced profile</p>
          <h2>Research and review</h2>
        </div>
        {subject.kind === "client" && (
          <button
            className="button"
            disabled={!reviewAccessible || busy}
            onClick={() => setUpload(true)}
          >
            Upload
          </button>
        )}
        <button
          className="button"
          disabled={!reviewAccessible || busy || run?.status === "running"}
          onClick={() => setShowRequest(!showRequest)}
          aria-expanded={showRequest}
        >
          Research missing details
        </button>
      </header>
      {subject.kind === "client" && (
        <p className="muted">
          Uploading saves a client file immediately. It does not start research
          or add the file to a run.
        </p>
      )}
      <QueryState
        pending={
          identity.isPending ||
          identity.isFetching ||
          (canRead && latest.isPending)
        }
        error={identity.error ?? latest.error ?? denied}
        retry={() => {
          void Promise.all([latest.refetch(), setup.refetch()]).then(
            ([review, sources]) => {
              if (review.isSuccess && sources.isSuccess) {
                action.mutation.reset();
                action.recovery.reset();
                research.mutation.reset();
                research.recover.reset();
              }
            },
          );
          if (identity.error) void identity.refetch();
        }}
      />
      {!identity.isPending &&
        !identity.isFetching &&
        !identity.error &&
        !canRead && (
          <p role="status">
            Your current session cannot access this profile review.
          </p>
        )}
      {canRead && (
        <>
          {!canEdit && reviewAccessible && (
            <p className="muted">
              Applying needs an admin. You can read the saved research and its
              sources.
            </p>
          )}
          <ReviewFeedback
            action={action}
            findings={run?.findings ?? []}
            canEdit={canEdit && reviewAccessible}
            canPresent={reviewAccessible}
            onRecovered={() => setConfirm(undefined)}
          />
          <ResearchFeedback
            research={research}
            runId={run?.id}
            canRecover={reviewAccessible}
          />
          {reviewAccessible && (showRequest || latest.data === null) && (
            <>
              <QueryState
                pending={setup.isPending}
                error={setup.error}
                retry={() => void setup.refetch()}
              />
              {setup.data && !setup.error && (
                <ResearchRequest
                  key={run?.id ?? "new"}
                  subject={subject}
                  businessUnitId={businessUnitId}
                  purpose={purpose}
                  capabilityId={capabilityId}
                  setup={setup.data}
                  previous={run ?? undefined}
                  disabled={busy || run?.status === "running"}
                  onStart={(input) =>
                    research.mutation.mutate(
                      { kind: "start", input },
                      { onSuccess: () => setShowRequest(false) },
                    )
                  }
                />
              )}
            </>
          )}
          {run && (
            <>
              {run.setup?.purpose && (
                <p className="muted">
                  Saved research scope: {run.setup.purpose.replaceAll("_", " ")}
                  {run.setup.businessUnit?.name
                    ? ` · ${run.setup.businessUnit.name}`
                    : ""}
                  .
                </p>
              )}
              <RunLedger
                run={run}
                busy={busy}
                onCancel={() => request({ kind: "cancel" })}
                onRetry={(task) =>
                  research.mutation.mutate({
                    kind: "retry",
                    selection: { runId: run.id, task },
                  })
                }
              />
              <BuildFindings
                subject={subject}
                run={run}
                busy={busy}
                canEdit={canEdit}
                onAction={request}
              />
            </>
          )}
          {reviewAccessible && !run && !latest.isPending && !latest.error && (
            <p className="muted">
              Your saved profile is available. Choose sources to research
              missing details.
            </p>
          )}
          {confirm && reviewAccessible && (
            <ReviewConfirmation
              action={confirm.action}
              pending={action.mutation.isPending}
              busy={busy}
              canRead={canRead}
              canEdit={canEdit}
              onBack={() => setConfirm(undefined)}
              onConfirm={() =>
                action.mutation.mutate(
                  { review: confirm.run, action: confirm.action },
                  { onSuccess: () => setConfirm(undefined) },
                )
              }
            />
          )}
        </>
      )}
    </section>
  );
}

function BuildFindings({
  subject,
  run,
  busy,
  canEdit,
  onAction,
}: {
  subject: ProfileSubject;
  run: ProfileBuildRun;
  busy: boolean;
  canEdit: boolean;
  onAction: (action: ReviewAction) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const eligible = run.findings.filter(canSelectFinding);
  const chosen = eligible
    .filter((f) => selected.includes(f.id))
    .map((f) => f.id);
  return (
    <div className={styles.findings}>
      <header className={styles.findingsHead}>
        <h3>Review proposals · {run.findings.length}</h3>
        <button
          className="button ghost"
          disabled={!canEdit || busy || !eligible.length}
          onClick={() => setSelected(eligible.slice(0, 200).map((f) => f.id))}
        >
          Select {eligible.length > 200 ? "first 200" : "eligible"}
        </button>
      </header>
      {!run.findings.length && (
        <p className={styles.empty}>
          {run.status === "running"
            ? "Findings appear as each source is saved."
            : "No findings were saved. Source coverage is shown above."}
        </p>
      )}
      {run.findings.map((finding) => (
        <FindingReview
          key={finding.id}
          subject={subject}
          finding={finding}
          checked={chosen.includes(finding.id)}
          editable={canEdit}
          busy={busy}
          onAction={onAction}
          onSelect={(checked) =>
            setSelected((current) =>
              checked
                ? [...new Set([...current, finding.id])]
                : current.filter((id) => id !== finding.id),
            )
          }
        />
      ))}
      <footer className={styles.footer}>
        <span>
          {chosen.length} selected. Approval keeps the original evidence.
        </span>
        <button
          className="button primary"
          disabled={!canEdit || busy || !chosen.length || chosen.length > 200}
          onClick={() => onAction({ kind: "apply", findingIds: chosen })}
        >
          Approve {chosen.length} selected
        </button>
      </footer>
    </div>
  );
}
