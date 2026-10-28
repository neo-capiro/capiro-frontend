"use client";
/**
 * Firm procedure governance surface (09.04 Skills and artifact templates).
 *
 * Consumes only the existing admin-gated Core owner through the shared governance client. It never
 * claims native SDK execution, never treats a returned 2xx as evidence of an effect on its own, and
 * never presents a row as available when the turn path would refuse it.
 *
 * This surface owns no async custody: the host that reads the current Core account owns the list, the
 * status message and the run lifetime, so a result that arrives after the account changed or the
 * surface unmounted is retired there instead of being rendered here.
 */
import { useMemo, useState } from "react";
import type { FirmSkillGovernanceRow } from "../../../shared/capiro/operations/meri-firm-skills";
import type { ProcedureGovernanceClient } from "../../../shared/meri-procedures/client";
import {
  canGovernProcedures,
  emptyProcedureForm,
  hasProcedureFormErrors,
  procedureAccountKey,
  procedureEditPlan,
  procedureFormBody,
  procedureUpdateBody,
  procedureView,
  validateProcedureForm,
  type ProcedureAccountIdentity,
  type ProcedureEditDraft,
  type ProcedureFormInput,
  type ProcedureMutationTarget,
} from "../../../shared/meri-procedures/governance";
import { MeriDialog } from "../ui/MeriDialog";
import ui from "../ui/meri-ui.module.css";
import surfaces from "../ui/surfaces.module.css";

/**
 * Runs one mutation under the host's account lifetime. Resolves true when the result still belonged to
 * the current account and was applied to the surface, false when it was retired (the account or role
 * changed, or the surface unmounted) and must not be shown.
 */
export type ProcedureRunner = (
  work: (signal: AbortSignal) => Promise<unknown>,
  describe: (value: unknown) => string,
) => Promise<boolean>;

export type ProcedureGovernanceProps = {
  identity: ProcedureAccountIdentity | null;
  client: ProcedureGovernanceClient;
  rows: readonly FirmSkillGovernanceRow[];
  loading: boolean;
  error: string | null;
  busy: boolean;
  /** Host-owned outcome text, set only while it still belongs to the current account. */
  message: string | null;
  /** Host-owned notice about the current account or lifetime, e.g. retired commands. */
  notice: string | null;
  /** True while an unknown outcome still needs an authoritative read-back. */
  blocked: boolean;
  /** Re-reads the stored rows: the read-back that releases an unknown outcome. */
  onReadback: () => void;
  run: ProcedureRunner;
};

const field = (
  label: string,
  value: string,
  onChange: (next: string) => void,
  error?: string,
) => (
  <label key={label} className={surfaces.caption}>
    {label}
    <input
      className={ui.outline}
      value={value}
      aria-invalid={error ? true : undefined}
      onChange={(event) => onChange(event.target.value)}
    />
    {error ? <span className={ui.muted}>{error}</span> : null}
  </label>
);

/**
 * The exact row identity/version/digest a control is fenced to. Each control captures it when the
 * operator acts, so a list refresh cannot silently rebind the action onto a newer stored row.
 */
const mutationTarget = (
  row: FirmSkillGovernanceRow,
): ProcedureMutationTarget => ({
  id: row.id,
  version: row.version,
  procedureDigest: row.procedureDigest,
});

export function ProcedureGovernance({
  identity,
  client,
  rows,
  loading,
  error,
  busy,
  message,
  notice,
  blocked,
  onReadback,
  run,
}: ProcedureGovernanceProps) {
  const [form, setForm] = useState<ProcedureFormInput>(emptyProcedureForm);
  const [draft, setDraft] = useState<ProcedureEditDraft | null>(null);
  const [editRefusal, setEditRefusal] = useState<string | null>(null);
  const [removing, setRemoving] = useState<{
    target: ProcedureMutationTarget;
    name: string;
  } | null>(null);
  const errors = useMemo(() => validateProcedureForm(form), [form]);
  const views = useMemo(() => rows.map(procedureView), [rows]);
  const permitted = canGovernProcedures(identity);
  // While an unknown outcome is unresolved, and for a non-admin or a busy surface, no control may
  // dispatch another change.
  const locked = busy || !permitted || blocked;

  const describeRow = (value: unknown): string => {
    const row = value as { version?: unknown; skillId?: unknown };
    return `Core reported ${String(row?.skillId ?? "the row")} at version ${String(
      row?.version ?? "?",
    )}. Reload to confirm the stored state before relying on it.`;
  };

  const beginEdit = (row: FirmSkillGovernanceRow) => {
    const plan = procedureEditPlan(row);
    if (!plan.ok) {
      setDraft(null);
      setForm(emptyProcedureForm());
      setEditRefusal(plan.reason);
      return;
    }
    setEditRefusal(null);
    setDraft(plan.draft);
    setForm(plan.draft.form);
  };

  const cancelEdit = () => {
    setDraft(null);
    setEditRefusal(null);
    setForm(emptyProcedureForm());
  };

  return (
    <div data-account-key={identity ? procedureAccountKey(identity) : "none"}>
      <p className={ui.muted}>
        Firm procedure governance uses the current Core account and the existing
        user_admin routes. A row marked available receives stored guidance on a
        matching turn; it is not native SDK execution, and procedure content
        never grants a tool, an effect or a memory permission.
      </p>
      {!permitted ? (
        <p className={ui.muted} role="status">
          Firm procedure governance requires the current Core user_admin or
          capiro_admin role.
        </p>
      ) : null}
      {loading ? (
        <p className={ui.muted} role="status">
          Reading the stored firm procedures for the current Core account…
        </p>
      ) : null}
      {error ? (
        <p className={ui.muted} role="alert">
          The stored firm procedures could not be read: {error}
        </p>
      ) : null}
      {notice ? (
        <p className={ui.muted} role="status">
          {notice}
        </p>
      ) : null}
      {blocked ? (
        <div>
          <p className={ui.muted} role="status">
            The result of the last firm procedure change is unknown, so further
            changes are held. Read the current stored state back and act on what
            is actually stored; the request is never replayed automatically.
          </p>
          <button type="button" className={ui.outline} onClick={onReadback}>
            Check current stored state
          </button>
        </div>
      ) : null}
      {message ? (
        <p className={ui.muted} role="status">
          {message}
        </p>
      ) : null}
      {editRefusal ? (
        <p className={ui.muted} role="alert">
          {editRefusal}
        </p>
      ) : null}

      <table className={ui.table}>
        <caption className={surfaces.caption}>
          Firm procedures and their stored versions
        </caption>
        <thead>
          <tr>
            <th scope="col">Procedure</th>
            <th scope="col">Version</th>
            <th scope="col">Digest</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {views.map((view) => {
            const row = rows.find((candidate) => candidate.id === view.id);
            return (
              <tr key={view.id}>
                <td>
                  <strong>{view.name}</strong>
                  <span className={surfaces.caption}>{view.canonicalId}</span>
                </td>
                <td>
                  v{view.version}
                  {view.restorableVersions.length > 0 ? (
                    <select
                      className={ui.outline}
                      aria-label={`Restore ${view.canonicalId}`}
                      defaultValue=""
                      disabled={locked}
                      onChange={(event) => {
                        const version = Number(event.target.value);
                        if (!row || !Number.isInteger(version) || version < 1)
                          return;
                        const target = mutationTarget(row);
                        void run(
                          (signal) =>
                            client.restore(
                              identity as ProcedureAccountIdentity,
                              target,
                              version,
                              signal,
                            ),
                          describeRow,
                        );
                      }}
                    >
                      <option value="">Restore…</option>
                      {view.restorableVersions.map((entry) => (
                        <option key={entry.version} value={entry.version}>
                          Restore exact version {entry.version}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </td>
                <td className={surfaces.caption}>
                  {view.digest ? view.digest.slice(0, 12) : "—"}
                </td>
                <td>
                  <span>{view.statusLabel}</span>
                  {view.validationErrors.length > 0 ? (
                    <ul className={ui.muted}>
                      {view.validationErrors.map((error) => (
                        <li key={error}>{error}</li>
                      ))}
                    </ul>
                  ) : null}
                  <button
                    type="button"
                    className={ui.outline}
                    disabled={locked}
                    onClick={() => {
                      if (!row) return;
                      const target = mutationTarget(row);
                      void run(
                        (signal) =>
                          client.setEnabled(
                            identity as ProcedureAccountIdentity,
                            target,
                            !row.enabled,
                            signal,
                          ),
                        describeRow,
                      );
                    }}
                  >
                    {view.enabled ? "Disable" : "Enable"}
                  </button>
                  <button
                    type="button"
                    className={ui.outline}
                    disabled={locked}
                    onClick={() => {
                      if (!row) return;
                      beginEdit(row);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className={ui.outline}
                    disabled={locked}
                    onClick={() => {
                      if (!row) return;
                      setRemoving({
                        target: mutationTarget(row),
                        name: row.skillId,
                      });
                    }}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (hasProcedureFormErrors(errors)) return;
          const editing = draft;
          const body = procedureFormBody(form);
          void run((signal) => {
            if (editing)
              return client.update(
                identity as ProcedureAccountIdentity,
                // The version the operator actually viewed when edit began, so a refresh between
                // opening and saving fails Core's fence instead of overwriting a newer row.
                editing.viewedTarget,
                procedureUpdateBody(editing, form),
                signal,
              );
            return client.create(
              identity as ProcedureAccountIdentity,
              body,
              signal,
            );
          }, describeRow).then((applied) => {
            if (applied) cancelEdit();
          });
        }}
      >
        {field(
          "Procedure id",
          form.id,
          (id) => setForm({ ...form, id }),
          errors.id,
        )}
        {field(
          "Name",
          form.name,
          (name) => setForm({ ...form, name }),
          errors.name,
        )}
        {field(
          "Triggers (comma separated)",
          form.triggers,
          (triggers) => setForm({ ...form, triggers }),
          errors.triggers,
        )}
        {field(
          "Required read tools (comma separated)",
          form.requiredTools,
          (requiredTools) => setForm({ ...form, requiredTools }),
          errors.requiredTools,
        )}
        {field(
          "Guidance addendum",
          form.systemAddendum,
          (systemAddendum) => setForm({ ...form, systemAddendum }),
          errors.systemAddendum,
        )}
        {draft ? (
          <p className={ui.muted}>
            Saving keeps the stored template and procedure manifest of version{" "}
            {draft.viewedTarget.version} unchanged; this form edits only the
            fields above.
          </p>
        ) : null}
        <button type="submit" className={ui.outline} disabled={locked}>
          {draft ? "Save new version" : "Create procedure"}
        </button>
        {draft ? (
          <button
            type="button"
            className={ui.outline}
            disabled={busy}
            onClick={cancelEdit}
          >
            Cancel edit
          </button>
        ) : null}
      </form>

      <MeriDialog
        open={removing !== null}
        onOpenChange={(open) => {
          if (!open) setRemoving(null);
        }}
        title="Remove stored procedure"
        description="Removing deletes this tenant's stored firm procedure row after Core verifies the viewed version. It is recorded in the existing audit entry and cannot be undone from this surface."
        width="compact"
      >
        <p className={ui.muted}>
          Remove {removing?.name} at version {removing?.target.version}?
        </p>
        <button
          type="button"
          className={ui.outline}
          disabled={locked}
          onClick={() => {
            const target = removing?.target;
            setRemoving(null);
            if (!target) return;
            void run(
              (signal) =>
                client.remove(
                  identity as ProcedureAccountIdentity,
                  target,
                  signal,
                ),
              describeRow,
            );
          }}
        >
          Remove procedure
        </button>
        <button
          type="button"
          className={ui.outline}
          onClick={() => setRemoving(null)}
        >
          Keep it
        </button>
      </MeriDialog>
    </div>
  );
}
