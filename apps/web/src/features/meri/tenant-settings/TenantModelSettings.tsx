"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import { FormField } from "../ui/FormField";
import { TenantSettingsController } from "./controller";
import {
  microToUsd,
  modelDraft,
  type ModelLimits,
  type TenantDocument,
} from "./client";
import ui from "../ui/meri-ui.module.css";
import styles from "../screens/settings/settings.module.css";

/** The application boundary replaces this view on session/organization changes. */
export function TenantModelSettings() {
  const identity = useCapiroQuery("me.read", {});
  if (identity.error || !identity.data)
    return (
      <p role="status">
        {identity.error
          ? "Current account could not be verified. Workspace limits are unavailable."
          : "Verifying your current account."}
      </p>
    );
  return (
    <OwnedSettings
      key={JSON.stringify([identity.data.tenant.id, identity.data.user.id])}
    />
  );
}

function OwnedSettings() {
  const [controller] = useState(() => new TenantSettingsController());
  useEffect(() => controller.attach(), [controller]);
  const view = useSyncExternalStore(
    controller.subscribe,
    controller.snapshot,
    controller.snapshot,
  );
  return (
    <div className={styles.stack}>
      <p role="status" aria-live="polite">
        {view.message}
      </p>
      {view.document ? (
        <ModelLimitsForm
          key={view.document.revision}
          document={view.document}
          editable={view.status === "ready"}
          save={(model) => {
            void controller.save(model);
          }}
        />
      ) : null}
      {!["loading", "saving"].includes(view.status) ? (
        <button
          type="button"
          className={ui.outline}
          onClick={() => {
            void controller.load();
          }}
        >
          Reload current limits
        </button>
      ) : null}
    </div>
  );
}

function ModelLimitsForm({
  document,
  editable,
  save,
}: {
  document: TenantDocument;
  editable: boolean;
  save: (model: ModelLimits) => void;
}) {
  const [monthly, setMonthly] = useState(
    microToUsd(document.model!.monthlyCapMicroUsd),
  );
  const [perQuery, setPerQuery] = useState(
    microToUsd(document.model!.maxBudgetMicroUsd),
  );
  const [turns, setTurns] = useState(String(document.model!.maxTurns));
  const [error, setError] = useState("");
  return (
    <form
      className={styles.stack}
      aria-label="Workspace model limits"
      onSubmit={(event) => {
        event.preventDefault();
        if (!editable) return;
        const model = modelDraft(monthly, perQuery, turns);
        if (!model) {
          setError(
            "Enter positive USD amounts with up to six decimal places and a whole turn limit from 1 to 100.",
          );
          return;
        }
        setError("");
        save(model);
      }}
    >
      <p className={ui.muted}>
        Saved revision {document.revision}. Workspace timezone:{" "}
        {document.defaultTimezone}.
      </p>
      {document.model!.monthlyCapMicroUsd === null ? (
        <p>
          No monthly cap is configured. New model runs remain unavailable until
          an administrator saves a cap.
        </p>
      ) : null}
      <FormField
        label="Monthly model budget (USD)"
        value={monthly}
        onChange={setMonthly}
        inputMode="decimal"
        maxLength={24}
        disabled={!editable}
        required
      />
      <FormField
        label="Per-query model budget (USD)"
        value={perQuery}
        onChange={setPerQuery}
        inputMode="decimal"
        maxLength={24}
        disabled={!editable}
        required
      />
      <FormField
        label="Maximum turns per query"
        value={turns}
        onChange={setTurns}
        inputMode="numeric"
        maxLength={3}
        disabled={!editable}
        required
      />
      <p className={ui.muted}>
        Timezone and capability policy are preserved. These limits are enforced
        by the settings owner; saving them does not start a run.
      </p>
      {error ? <p role="alert">{error}</p> : null}
      <button type="submit" className={ui.primary} disabled={!editable}>
        Save workspace limits
      </button>
    </form>
  );
}
