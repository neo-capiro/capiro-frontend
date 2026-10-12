"use client";
import { useState } from "react";
import type { PlannerResource } from "../../../shared/capiro/operations/planner-schemas";
import { useCapiroMutation } from "../../../shared/capiro/queries";
import { ActionButton, Panel, TextInput } from "../../../shared/module-ui";
import styles from "./planner.module.css";
export function FormSharing({
  resource,
}: {
  resource: Extract<PlannerResource, { kind: "form" }>;
}) {
  const mutation = useCapiroMutation("planner.form.share"),
    [confirmed, setConfirmed] = useState(false);
  const update = async (enabled: boolean) => {
    try {
      await mutation.run({
        params: { id: resource.id },
        body: { version: resource.version, enabled },
      });
    } catch {
      /* A changed resource must be reloaded before rotating a capability. */
    }
  };
  const link = mutation.data?.token
    ? `${window.location.origin}/forms/${mutation.data.token}`
    : "";
  return (
    <Panel title="Public request link">
      <p>
        Publishing creates a revocable link. Anyone with that link can submit
        these questions. Generating a new link replaces the previous link.
      </p>
      <label className={styles.checkbox}>
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
          disabled={mutation.pending || Boolean(mutation.data)}
        />
        I reviewed the public questions and access settings.
      </label>
      <div className={styles.actions}>
        <ActionButton
          disabled={
            !confirmed ||
            mutation.pending ||
            Boolean(mutation.data) ||
            resource.data.audience === "organization"
          }
          onClick={() => void update(true)}
        >
          Generate public link
        </ActionButton>
        <ActionButton
          disabled={!confirmed || mutation.pending || Boolean(mutation.data)}
          onClick={() => void update(false)}
        >
          Revoke public link
        </ActionButton>
      </div>
      {resource.data.audience === "organization" && (
        <p>
          Change form access to Anyone with the link in the form editor before
          publishing.
        </p>
      )}
      {link && (
        <TextInput
          aria-label="Public form link"
          readOnly
          value={link}
          onFocus={(event) => event.target.select()}
        />
      )}
      {mutation.data && (
        <p role="status">
          {link
            ? "Public link created. Copy and share this link as needed."
            : "Public link revoked."}{" "}
          Reopen the form before making another change.
        </p>
      )}
      {mutation.error && <p role="alert">{mutation.error.message}</p>}
    </Panel>
  );
}
