"use client";
import { useState, type ComponentProps } from "react";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { UploadDialog } from "@/features/portfolio/files/public";
import { canSelectFinding, type FillRun } from "./contracts";
import {
  useEnrichmentAccess,
  useEnrichmentSetup,
  useLatestReview,
} from "./queries";
import { useReviewAction } from "./useReviewAction";
import type { ReviewAction } from "./actions";
import { FindingReview } from "./FindingReview";
import { ResearchSetup } from "./ResearchSetup";
import { RunLedger } from "./RunLedger";
import { ReviewFeedback } from "./ReviewFeedback";
import { ReviewConfirmation } from "./ReviewConfirmation";
import { useResearchCommands } from "./useResearchCommands";
import { ResearchFeedback } from "./ResearchFeedback";
import { EnrichmentToolbar } from "./EnrichmentToolbar";
import styles from "./enrichment.module.css";
export function ClientEnrichmentDialog({
  clientId,
  open,
  onOpenChange,
  onCloseAutoFocus,
}: {
  clientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCloseAutoFocus?: ComponentProps<typeof Dialog>["onCloseAutoFocus"];
}) {
  const access = useEnrichmentAccess();
  return (
    <ClientEnrichmentReview
      key={`${clientId}:${access.identity.data?.tenant?.id}:${access.identity.data?.user.id}`}
      clientId={clientId}
      open={open}
      onOpenChange={onOpenChange}
      onCloseAutoFocus={onCloseAutoFocus}
      access={access}
    />
  );
}
function ClientEnrichmentReview({
  clientId,
  open,
  onOpenChange,
  access,
  onCloseAutoFocus,
}: {
  clientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  access: ReturnType<typeof useEnrichmentAccess>;
  onCloseAutoFocus?: ComponentProps<typeof Dialog>["onCloseAutoFocus"];
}) {
  const { identity, canRead, canEdit } = access;
  const latest = useLatestReview(clientId, open && canRead);
  const setup = useEnrichmentSetup(clientId, open && canRead);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<{
    run: FillRun;
    action: ReviewAction;
  }>();
  const [showSetup, setShowSetup] = useState(false);
  const [upload, setUpload] = useState<{ beforeDispatch: () => void }>();
  const research = useResearchCommands(
    clientId,
    {
      userId: identity.data?.user.id ?? "",
      tenantId: identity.data?.tenant?.id ?? "",
    },
    open,
    canRead,
  );
  const action = useReviewAction(
    clientId,
    open,
    {
      userId: identity.data?.user.id ?? "",
      tenantId: identity.data?.tenant?.id ?? "",
    },
    canRead,
  );
  const run = action.uncertain
    ? action.uncertainReview
    : !latest.error
      ? latest.data
      : undefined;
  const chosen =
    run?.findings
      .filter((f) => selected.includes(f.id) && canSelectFinding(f))
      .map((f) => f.id) ?? [];
  const busy =
    action.mutation.isPending ||
    action.recovery.isPending ||
    action.checkingRecovery ||
    research.busy ||
    research.blocked ||
    latest.isFetching ||
    action.uncertain;
  const request = (next: ReviewAction) => {
    if (run) setConfirm({ run, action: next });
  };
  return (
    <Dialog
      drawer
      open={open}
      onOpenChange={onOpenChange}
      title="Fill with Meri"
      className={styles.drawer}
      onCloseAutoFocus={onCloseAutoFocus}
    >
      <div className={styles.scroll}>
        <QueryState
          pending={identity.isPending}
          error={identity.error}
          retry={() => void identity.refetch()}
        />
        {!identity.isPending && !identity.error && !canRead && (
          <p role="status">
            Your current session cannot access this client review.
          </p>
        )}
        {canRead && (
          <>
            <EnrichmentToolbar
              website={setup.data?.website}
              canEdit={canEdit}
              busy={busy}
              running={run?.status === "running"}
              onSetup={() => setShowSetup(true)}
              onUpload={() =>
                setUpload({ beforeDispatch: action.createUploadGuard() })
              }
            />
            {upload && canEdit && (
              <UploadDialog
                clientId={clientId}
                beforeDispatch={upload.beforeDispatch}
                onClose={() => setUpload(undefined)}
              />
            )}
            <QueryState
              pending={latest.isPending}
              error={latest.error}
              retry={() => void latest.refetch()}
            />
            <ReviewFeedback
              action={action}
              findings={run?.findings ?? []}
              canEdit={canEdit}
              onRecovered={() => setConfirm(undefined)}
            />
            <ResearchFeedback research={research} runId={run?.id} />
            {(showSetup || (!latest.isPending && !latest.error && !run)) && (
              <>
                <QueryState
                  pending={setup.isPending}
                  error={setup.error}
                  retry={() => void setup.refetch()}
                />
                {setup.data && !setup.error && (
                  <ResearchSetup
                    key={run?.id ?? "new"}
                    clientId={clientId}
                    setup={setup.data}
                    previous={run ?? undefined}
                    disabled={!canRead || busy || run?.status === "running"}
                    onStart={(input) =>
                      research.mutation.mutate(
                        { kind: "start", input },
                        {
                          onSuccess: () => setShowSetup(false),
                        },
                      )
                    }
                  />
                )}
              </>
            )}
            {run && (
              <>
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
                <header className={styles.findingsHead}>
                  <h3>Findings · {run.findings.length}</h3>
                  <button
                    className="button ghost"
                    disabled={!canEdit || busy}
                    onClick={() =>
                      setSelected(
                        run.findings
                          .filter(canSelectFinding)
                          .slice(0, 200)
                          .map((f) => f.id),
                      )
                    }
                  >
                    {run.findings.filter(canSelectFinding).length > 200
                      ? "Select first 200 new"
                      : "Select all new"}
                  </button>
                </header>
                {!run.findings.length && (
                  <p className={styles.empty}>
                    {run.status === "running"
                      ? "Research is still running. Findings will appear as they are saved."
                      : "No findings were saved in this run. This does not establish full source coverage."}
                  </p>
                )}
                {chosen.length > 200 && (
                  <p className={styles.empty} role="alert">
                    Apply up to 200 findings at a time. Deselect findings before
                    continuing.
                  </p>
                )}
                {run.findings.map((f) => (
                  <FindingReview
                    key={f.id}
                    clientId={clientId}
                    finding={f}
                    checked={chosen.includes(f.id)}
                    editable={canEdit && !action.uncertain}
                    busy={busy}
                    onSelect={(checked) =>
                      setSelected(
                        checked
                          ? [...selected.filter((id) => id !== f.id), f.id]
                          : selected.filter((id) => id !== f.id),
                      )
                    }
                    onAction={request}
                  />
                ))}
                {confirm && (
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
          </>
        )}
      </div>
      <footer className={styles.footer}>
        <span>
          {canEdit
            ? `${chosen.length} selected. Applying saves reviewed findings.`
            : "Applying needs an admin."}
        </span>
        <button className="button" onClick={() => onOpenChange(false)}>
          Close review
        </button>
        <button
          className="button primary"
          disabled={!canEdit || busy || !chosen.length || chosen.length > 200}
          onClick={() => request({ kind: "apply", findingIds: chosen })}
        >
          Apply {chosen.length} selected
        </button>
      </footer>
    </Dialog>
  );
}
