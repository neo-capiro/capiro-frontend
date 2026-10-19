"use client";
import { useState } from "react";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { AlertCriteria } from "./AlertCriteria";
import { AlertDelivery, AlertQuietHours } from "./AlertDelivery";
import { usePreferenceEditor } from "./usePreferenceEditor";
import type { PreferenceActor } from "./personal-access";
import type { PersonalPreferences } from "./personal-contracts";
import type { PersonalPreferencesSource } from "./personal-queries";
import { usePhoneVerification } from "./usePhoneVerification";
import { useTestAlert } from "./useTestAlert";
import { PhoneVerification } from "./PhoneVerification";
import { TestAlert } from "./TestAlert";
import styles from "./preferences.module.css";

export function PreferenceForm(props: {
  initial: PersonalPreferences;
  source: PersonalPreferencesSource;
  owner: PreferenceActor;
  clientId: string;
  clientCurrent: boolean;
  onClose: () => void;
}) {
  const editor = usePreferenceEditor(props);
  const [confirmReload, setConfirmReload] = useState(false);
  const { status } = editor;
  const savedCurrent =
    editor.current &&
    props.source.current &&
    !editor.dirty &&
    !editor.busy &&
    !editor.needsReload &&
    !status.expired;
  const view = {
    owner: props.owner,
    clientId: props.clientId,
    baseline: editor.baseline,
    available: savedCurrent,
    draftKey: JSON.stringify(editor.draft),
  };
  const verification = usePhoneVerification(view, editor.acceptChannelReceipt);
  const test = useTestAlert(view);
  const channelBusy = verification.busy || test.busy;
  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        if (!channelBusy) void editor.save();
      }}
    >
      <div className={styles.body}>
        {status.expired ? (
          <p role="status">
            Your account changed. Close this view and reopen your preferences.
          </p>
        ) : (
          <>
            {editor.current ? (
              <fieldset
                className={styles.fields}
                disabled={editor.busy || channelBusy}
              >
                <legend className="srOnly">
                  Personal bill alert preferences
                </legend>
                <AlertCriteria
                  draft={editor.draft}
                  onChange={editor.edit}
                  showJurisdictions={props.owner.backend === "intelligence"}
                />
                <AlertDelivery
                  draft={editor.draft}
                  record={editor.baseline}
                  onChange={editor.edit}
                  phoneLimit={props.owner.backend === "core" ? 20 : 32}
                  strictEmail={props.owner.backend === "intelligence"}
                />
                <AlertQuietHours draft={editor.draft} onChange={editor.edit} />
              </fieldset>
            ) : (
              <QueryState
                pending={props.source.isPending}
                error={props.source.error}
              />
            )}
            <fieldset
              className={styles.fields}
              disabled={editor.busy || test.busy}
            >
              <PhoneVerification
                action={verification}
                savedCurrent={savedCurrent}
              />
            </fieldset>
            <fieldset
              className={styles.fields}
              disabled={editor.busy || verification.busy}
            >
              <TestAlert action={test} savedCurrent={savedCurrent} />
            </fieldset>
            {editor.current && <QueryState error={status.error} />}
            {status.phase === "saved" && (
              <p role="status">Preferences saved.</p>
            )}
            {status.phase === "unconfirmed" && (
              <p role="alert">
                The save could not be confirmed. Your local draft is retained.
                Reload saved preferences before another save.
              </p>
            )}
            {(editor.changed || status.phase === "refused") && (
              <p role="status">
                Reload saved preferences before saving again. Your local draft
                is retained.
              </p>
            )}
            {!editor.current && (
              <p role="status">
                Saved preferences are unavailable. Local edits are retained
                until you reload.
              </p>
            )}
            {(editor.dirty ||
              editor.needsReload ||
              !editor.current ||
              !props.source.current) &&
              !confirmReload && (
                <button
                  className="button"
                  type="button"
                  disabled={editor.busy || channelBusy}
                  onClick={() => setConfirmReload(true)}
                >
                  Reload saved preferences
                </button>
              )}
            {confirmReload && (
              <div className={styles.reload}>
                <p>
                  Reloading discards local edits and reads the saved
                  preferences.
                </p>
                <div className="row">
                  <button
                    className="button"
                    type="button"
                    disabled={editor.busy || channelBusy}
                    onClick={() => {
                      void editor.reload().then(() => setConfirmReload(false));
                    }}
                  >
                    {status.phase === "reloading"
                      ? "Reloading…"
                      : "Discard edits and reload"}
                  </button>
                  <button
                    className="button ghost"
                    type="button"
                    disabled={editor.busy || channelBusy}
                    onClick={() => setConfirmReload(false)}
                  >
                    Keep local edits
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <footer className={styles.footer}>
        <button className="button" type="button" onClick={props.onClose}>
          Cancel
        </button>
        <button
          className="button primary"
          type="submit"
          disabled={!editor.canSave || channelBusy}
        >
          {status.phase === "saving" ? "Saving…" : "Save preferences"}
        </button>
      </footer>
    </form>
  );
}
