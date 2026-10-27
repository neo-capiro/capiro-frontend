"use client";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCapiro } from "../../../../shared/capiro/CapiroBoundary";
import { CapiroApiError } from "../../../../shared/capiro/http";
import type { ResearchDetail } from "../../../../shared/capiro/operations/research-schemas";
import type {
  ResearchDashboardDesign,
  ResearchDashboardLayout,
} from "../../../../shared/capiro/operations/research-share-schemas";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import { currentClientWriter } from "../../../../shared/portfolio/auth/client-writer";
import { useIdentity } from "../../../../shared/portfolio/auth/identity";
import { ActionButton, StatusPanel } from "../../../../shared/module-ui";
import { defaultLayout } from "./dashboard-layout";
import { DashboardDesigner } from "./DashboardDesigner";
import { buildPreviewDashboard } from "./preview-dashboard";
import {
  designDraftKey,
  designEditorLock,
  readDesignDraft,
  writeDesignDraft,
  type DesignDraft,
  type DesignDraftScope,
} from "./design-draft";
import styles from "./share.module.css";

type Props = {
  portfolio: ResearchDetail;
  design?: ResearchDashboardDesign;
  seed?: {
    name: string;
    layout: ResearchDashboardLayout;
    sourceId: string;
    designId: string;
    version: number;
  };
  clientId: string;
  onDone: () => void;
};
export function DesignEditor(props: Props) {
  const cache = useQueryClient();
  const identity = useIdentity();
  const actor = currentClientWriter(cache);
  const allowed =
    identity.isSuccess &&
    !identity.isFetching &&
    !identity.error &&
    actor &&
    props.portfolio.lifecycle === "active" &&
    props.portfolio.myRole !== "viewer" &&
    (!props.design || props.design.portfolioId === props.portfolio.id) &&
    ((!props.clientId && props.portfolio.clientLinks.length === 0) ||
      props.portfolio.clientLinks.some(
        (link) => link.clientId === props.clientId,
      ));
  if (!allowed || !actor)
    return (
      <StatusPanel
        loading={identity.isFetching}
        error="Current account, portfolio and client access must be verified before opening a draft."
        onRetry={() => void identity.refetch()}
      />
    );
  const scope: DesignDraftScope = {
    ...actor,
    portfolioId: props.portfolio.id,
    clientId: props.clientId,
    designId:
      props.design?.id ??
      (props.seed
        ? `copy:${props.seed.sourceId}:${props.seed.designId}`
        : "new"),
    portfolioRevision: props.portfolio.revision,
    designVersion: props.design?.version ?? props.seed?.version ?? 0,
  };
  return (
    <ScopedDesignEditor key={JSON.stringify(scope)} {...props} scope={scope} />
  );
}

function ScopedDesignEditor({
  portfolio,
  design,
  seed,
  clientId,
  onDone,
  scope: initialScope,
}: Props & { scope: DesignDraftScope }) {
  const [scope] = useState(initialScope);
  const api = useCapiro();
  const cache = useQueryClient();
  const [recovery, setRecovery] = useState<{
    state: "checking" | "ready" | "blocked";
    draft?: DesignDraft;
    message?: string;
  }>({ state: "checking" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [storageError, setStorageError] = useState("");
  const [pending, setPending] = useState(false);
  const [canDiscard, setCanDiscard] = useState(false);
  const ownsLock = useRef(false);
  const draftRef = useRef<DesignDraft | undefined>(undefined);
  const params = { id: portfolio.id };
  const analytics = useCapiroQuery("research.analytics", { params });
  const fit = useCapiroQuery("research.fit", { params });
  const changes = useCapiroQuery("research.changes", {
    params,
    query: { limit: 25 },
  });
  const snapshots = useCapiroQuery("research.snapshots", { params });
  useEffect(() => {
    let disposed = false;
    let release: (() => void) | undefined;
    const blocked = (message: string) => {
      if (!disposed) setRecovery({ state: "blocked", message });
    };
    if (!navigator.locks) {
      blocked(
        "This browser cannot protect a second editor. Open this design in a browser with editor locking support.",
      );
      return;
    }
    void navigator.locks
      .request(designEditorLock(scope), { ifAvailable: true }, async (lock) => {
        if (disposed) return;
        if (!lock) {
          blocked(
            "This design is already open in another editor. Close that editor, then reopen this design.",
          );
          return;
        }
        ownsLock.current = true;
        setCanDiscard(true);
        try {
          const retained = readDesignDraft(sessionStorage, scope);
          if (retained.state === "stale" || retained.state === "corrupt") {
            blocked(
              "A retained draft is stale or cannot be read. It was not restored. Discard it to reopen the current saved design.",
            );
          } else {
            const draft =
              retained.state === "ready" ? retained.draft : undefined;
            draftRef.current = draft;
            setPending(draft?.pending ?? false);
            setRecovery({ state: "ready", draft });
          }
        } catch {
          blocked(
            "Draft storage is unavailable. This editor cannot promise refresh recovery. Enable session storage and reopen the design.",
          );
        }
        await new Promise<void>((resolve) => {
          release = resolve;
          if (disposed) resolve();
        });
        ownsLock.current = false;
      })
      .catch(() =>
        blocked("Editor locking failed. Close and reopen the design."),
      );
    return () => {
      disposed = true;
      ownsLock.current = false;
      release?.();
    };
  }, [scope]);
  const retain = useCallback(
    (name: string, layout: ResearchDashboardLayout) => {
      if (!ownsLock.current || draftRef.current?.pending) return;
      const draft: DesignDraft = {
        schema: 1,
        scope,
        updatedAt: Date.now(),
        name,
        layout,
        pending: false,
      };
      draftRef.current = draft;
      try {
        writeDesignDraft(sessionStorage, draft);
        setStorageError("");
      } catch {
        setStorageError(
          "These edits could not be retained. Keep this page open; saving is disabled until storage works.",
        );
      }
    },
    [scope],
  );
  function discard() {
    if (!ownsLock.current) return;
    try {
      sessionStorage.removeItem(designDraftKey(scope));
      onDone();
    } catch {
      setError(
        "The retained draft could not be removed. Keep this page open and retry when storage is available.",
      );
    }
  }
  async function save(name: string, layout: ResearchDashboardLayout) {
    const current = currentClientWriter(cache);
    if (
      busy ||
      pending ||
      !ownsLock.current ||
      !current ||
      current.userId !== scope.userId ||
      current.tenantId !== scope.tenantId
    )
      return;
    const retained: DesignDraft = {
      schema: 1,
      scope,
      name,
      layout,
      updatedAt: Date.now(),
      pending: true,
    };
    try {
      writeDesignDraft(sessionStorage, retained);
    } catch {
      setStorageError(
        "Save was not sent because recovery storage is unavailable.",
      );
      return;
    }
    draftRef.current = retained;
    setPending(true);
    setBusy(true);
    setError("");
    try {
      const saved = design
        ? await api.request("research.designs.update", {
            params: { id: portfolio.id, designId: design.id },
            body: { name, layout, expectedVersion: design.version },
          })
        : await api.request("research.designs.create", {
            params,
            body: { name, layout },
          });
      if (
        saved.portfolioId !== portfolio.id ||
        (design && saved.id !== design.id)
      )
        throw new Error("The saved design receipt did not match this editor.");
      const acknowledgedActor = currentClientWriter(cache);
      if (
        !ownsLock.current ||
        acknowledgedActor?.userId !== scope.userId ||
        acknowledgedActor.tenantId !== scope.tenantId
      )
        return;
      sessionStorage.removeItem(designDraftKey(scope));
      onDone();
    } catch (failure) {
      setError(
        failure instanceof CapiroApiError && failure.status === 409
          ? "The saved design changed in another editor. Your edits are retained. Return to saved designs and compare before making another change."
          : "The save result is uncertain or was refused. Your edits are retained. Check saved designs before trying another save; this request will not be replayed.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (recovery.state !== "ready")
    return (
      <div className={styles.stack}>
        <StatusPanel
          loading={recovery.state === "checking"}
          error={recovery.message}
        />
        <ActionButton onClick={onDone}>Back to saved designs</ActionButton>
        {recovery.state === "blocked" && canDiscard && (
          <ActionButton onClick={discard}>Discard retained draft</ActionButton>
        )}
        {error && <p role="alert">{error}</p>}
      </div>
    );
  const preview = analytics.data
    ? buildPreviewDashboard(
        {
          portfolio,
          clientId,
          branding: true,
          analytics: analytics.data,
          fit: fit.data,
          changes: changes.data?.items,
        },
        design?.layout ?? defaultLayout(),
      )
    : undefined;
  return (
    <div className={styles.stack}>
      <p className={styles.hint}>
        Layout preview uses current authorized portfolio data. Review the frozen
        recipient payload when publishing. Edits are retained in this browser
        tab for up to 24 hours.
      </p>
      {recovery.draft && (
        <p role="status">
          Unsaved edits restored for this account, portfolio, client and design
          version.
        </p>
      )}
      {pending && (
        <div role="status">
          A save may already have been recorded. Check saved designs before
          continuing.{" "}
          <ActionButton disabled={busy} onClick={onDone}>
            Check saved designs
          </ActionButton>
          <ActionButton disabled={busy} onClick={discard}>
            Discard retained draft
          </ActionButton>
        </div>
      )}
      {storageError && <p role="alert">{storageError}</p>}
      <div inert={busy || pending}>
        <DashboardDesigner
          initialName={recovery.draft?.name ?? design?.name ?? seed?.name ?? ""}
          initialLayout={
            recovery.draft?.layout ??
            design?.layout ??
            seed?.layout ??
            defaultLayout()
          }
          preview={preview}
          snapshots={snapshots.data}
          busy={busy || pending || Boolean(storageError)}
          error={error}
          onDraft={retain}
          onSave={save}
          onCancel={discard}
        />
      </div>
    </div>
  );
}
