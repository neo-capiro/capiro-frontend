"use client";
import { useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { useMeriCapabilities } from "../../../shared/meri-resources/CapabilityContext";
import { meriCapabilityHref } from "../../../shared/meri-resources/capabilities";
import { scopedHref } from "../../../shared/session/client-route";
import { ModelSelectionPicker } from "../model-selection/ModelSelectionPicker";
import modelStyles from "../model-selection/model-selection.module.css";
import { ProcedureSelectionPicker } from "./ProcedureSelectionPicker";
import { SiteWorkflowPicker } from "./SiteWorkflowPicker";
import { SkillSelectionPicker } from "./SkillSelectionPicker";
import { WorkSelectionPicker } from "../work/WorkSelectionPicker";
import type { ComposerControls } from "./session-composer-controls";
import type { useConversationSession } from "./useConversationSession";
import type { QuickActionGate } from "./quick-action-gate";
import styles from "./tools.module.css";

type Session = ReturnType<typeof useConversationSession>;

/**
 * Optional per-message settings. Desktop keeps a non-modal column beside the transcript, so the
 * composer stays usable; the phone presents the same controls as a dismissible sheet. Nothing here
 * sends: each choice binds to the current draft selection through the existing owner.
 */
export function SessionTools({
  open,
  session,
  controls,
  gate,
  onClose,
}: {
  open: boolean;
  session: Session;
  controls: ComposerControls;
  gate: QuickActionGate;
  onClose: () => void;
}) {
  const close = useRef<HTMLButtonElement>(null);
  // Focus returns to the composer's Tools control, which stays mounted across connection states.
  const dismiss = useCallback(() => {
    onClose();
    document.getElementById("meri-tools-button")?.focus();
  }, [onClose]);
  useEffect(() => {
    if (!open) return;
    close.current?.focus();
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [open, dismiss]);
  const capabilities = useMeriCapabilities();
  if (!open) return null;
  const {
    current,
    modelDocument,
    modelSelection,
    selectionDisabled,
    modelDisabled,
  } = controls;
  // The other real workspaces stay reachable here instead of a duplicated row under the composer.
  const workspaces = (
    [
      ["actions", "Recommendation actions"],
      ["taskUpdates", "Task updates"],
      ["runs", "Runs"],
      ["memory", "Personal memory review"],
    ] as const
  ).flatMap(([id, label]) => {
    const href = meriCapabilityHref(id, capabilities);
    return href
      ? [{ id, label, href: scopedHref(href, session.clientId ?? undefined) }]
      : [];
  });
  return (
    <aside
      id="meri-tools-panel"
      className={styles.panel}
      role="dialog"
      aria-modal="false"
      aria-labelledby="meri-tools-title"
    >
      <div className={styles.heading}>
        <h2 id="meri-tools-title">Tools</h2>
        <button
          ref={close}
          type="button"
          className={styles.close}
          aria-label="Close tools"
          onClick={dismiss}
        >
          <X aria-hidden />
        </button>
      </div>
      <p className={styles.note}>
        Optional settings for your next message. Your draft stays editable.
      </p>
      <SkillSelectionPicker
        key={JSON.stringify(session.skillSelection)}
        selection={session.skillSelection}
        clientId={session.ready?.port.context.selectedClientId ?? null}
        disabled={selectionDisabled}
        gate={gate}
        onChange={session.setSkillSelection}
      />
      {current && (
        <SiteWorkflowPicker
          key={`website:${JSON.stringify(current.port.context)}`}
          conversationId={current.port.context.conversationId}
          selection={session.skillSelection}
          disabled={modelDisabled}
          onChange={session.setSkillSelection}
        />
      )}
      {/* Start Work / Delegate is additive: it never withdraws another selected input. */}
      <WorkSelectionPicker
        key={JSON.stringify(session.skillSelection.work ?? null)}
        selection={session.skillSelection}
        disabled={modelDisabled}
        onChange={session.setSkillSelection}
      />
      {/*
        The native procedure control lists what Core currently offers this account and tenant, and
        retires a choice the catalog no longer lists. Listing is not execution: the canonical
        receiver still decides what a draft may carry, and Core re-resolves the exact procedure,
        version, digest and client access when the message is actually sent.
      */}
      {session.ready && (
        <ProcedureSelectionPicker
          key={`procedure:${JSON.stringify(session.ready.port.context)}`}
          tenantId={session.ready.port.context.tenantId}
          lifetime={JSON.stringify(session.ready.port.context)}
          selection={session.skillSelection}
          disabled={modelDisabled}
          onChange={session.setSkillSelection}
        />
      )}
      {!session.accessLost && session.modelCatalog && (
        <div className={modelStyles.slot}>
          {modelDocument ? (
            <ModelSelectionPicker
              catalog={modelDocument.modelCatalog}
              label="Model for next message"
              prefix="Model"
              compact
              value={modelSelection}
              disabled={modelDisabled}
              onChange={(value) =>
                session.setModelSelection(value ?? undefined)
              }
              defaultLabel={
                session.acceptedRequest || session.earlier.length
                  ? "Continue current model"
                  : "Use personal default"
              }
              defaultShortLabel={
                session.acceptedRequest || session.earlier.length
                  ? "Current"
                  : "Default"
              }
              defaultDescription="The server chooses your personal default for the first message and inherits the admitted model for later messages."
            />
          ) : (
            <span className={modelStyles.recovery} role="status">
              {session.modelCatalog.loading
                ? "Loading model choices…"
                : "Model choices unavailable."}
            </span>
          )}
          {!modelDocument && !session.modelCatalog.loading && (
            <div className={modelStyles.recovery}>
              <button type="button" onClick={session.modelCatalog.refresh}>
                Reload models
              </button>
              {modelSelection && (
                <button
                  type="button"
                  disabled={modelDisabled}
                  onClick={() => session.setModelSelection(undefined)}
                >
                  Use default
                </button>
              )}
            </div>
          )}
        </div>
      )}
      {workspaces.length > 0 && (
        <nav className={styles.workspaces} aria-label="Meri workspaces">
          <h3 className={styles.workspacesTitle}>Workspaces</h3>
          {workspaces.map((workspace) => (
            <Link key={workspace.id} href={workspace.href}>
              {workspace.label}
            </Link>
          ))}
        </nav>
      )}
    </aside>
  );
}
