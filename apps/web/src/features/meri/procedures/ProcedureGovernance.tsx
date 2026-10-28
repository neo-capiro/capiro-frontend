"use client";
/**
 * Firm procedure governance surface (09.04 Skills and artifact templates).
 *
 * Consumes only the existing admin-gated Core owner through the shared governance client. It never
 * claims native SDK execution, never treats a returned 2xx as evidence of an effect on its own, and
 * never presents a row as available when the turn path would refuse it.
 */
import { useMemo, useState } from "react";
import type { FirmSkillGovernanceRow } from "../../../shared/capiro/operations/meri-firm-skills";
import type { ProcedureGovernanceClient } from "../../../shared/meri-procedures/client";
import {
  ProcedureAccountChanged,
  ProcedureRoleDenied,
  ProcedureRevisionConflict,
  ProcedureUncertainWrite,
  canGovernProcedures,
  emptyProcedureForm,
  hasProcedureFormErrors,
  procedureAccountKey,
  procedureFormBody,
  procedureView,
  retireStaleAccountCommands,
  validateProcedureForm,
  type ProcedureAccountIdentity,
  type ProcedureFormInput,
} from "../../../shared/meri-procedures/governance";
import ui from "../../ui/meri-ui.module.css";
import surfaces from "../../ui/surfaces.module.css";

export type ProcedureGovernanceProps = {
  identity: ProcedureAccountIdentity | null;
  client: ProcedureGovernanceClient;
  rows: readonly FirmSkillGovernanceRow[];
  onReload: () => void;
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

export function ProcedureGovernance({
  identity,
  client,
  rows,
  onReload,
}: ProcedureGovernanceProps) {
  const [form, setForm] = useState<ProcedureFormInput>(emptyProcedureForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const errors = useMemo(() => validateProcedureForm(form), [form]);
  const views = useMemo(() => rows.map(procedureView), [rows]);
  const permitted = canGovernProcedures(identity);
  // A different current account retires pending results instead of replaying them. Derived, not
  // written during render.
  const retiredAccounts = useMemo(
    () =>
      identity
        ? retireStaleAccountCommands(client.commands, identity).retired.length
        : 0,
    [identity, client.commands],
  );

  const run = async (
    work: () => Promise<unknown>,
    describe: (value: unknown) => string,
  ) => {
    if (!identity || !permitted) {
      setMessage(new ProcedureRoleDenied().message);
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const result = await work();
      setMessage(describe(result));
      onReload();
    } catch (error) {
      if (
        error instanceof ProcedureRevisionConflict ||
        error instanceof ProcedureUncertainWrite ||
        error instanceof ProcedureRoleDenied ||
        error instanceof ProcedureAccountChanged
      )
        setMessage(error.message);
      else setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const describeRow = (value: unknown): string => {
    const row = value as { version?: unknown; skillId?: unknown };
    return `Core reported ${String(row?.skillId ?? "the row")} at version ${String(
      row?.version ?? "?",
    )}. Reload to confirm the stored state before relying on it.`;
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
      {retiredAccounts > 0 ? (
        <p className={ui.muted} role="status">
          The current account or role changed. Pending firm procedure results
          were retired; review the row again.
        </p>
      ) : null}
      {message ? (
        <p className={ui.muted} role="status">
          {message}
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
          {views.map((view) => (
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
                    disabled={busy}
                    onChange={(event) => {
                      const version = Number(event.target.value);
                      const row = rows.find(
                        (candidate) => candidate.id === view.id,
                      );
                      if (!row || !Number.isInteger(version) || version < 1)
                        return;
                      void run(
                        () =>
                          client.restore(
                            identity as ProcedureAccountIdentity,
                            row,
                            version,
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
                  disabled={busy || !permitted}
                  onClick={() => {
                    const row = rows.find(
                      (candidate) => candidate.id === view.id,
                    );
                    if (!row) return;
                    void run(
                      () =>
                        client.setEnabled(
                          identity as ProcedureAccountIdentity,
                          row,
                          !row.enabled,
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
                  disabled={busy || !permitted}
                  onClick={() => {
                    const row = rows.find(
                      (candidate) => candidate.id === view.id,
                    );
                    if (!row) return;
                    setEditingId(row.id);
                    setForm({
                      id: row.skillId,
                      name: row.name,
                      triggers: "",
                      requiredTools: "",
                      systemAddendum: "",
                    });
                  }}
                >
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (hasProcedureFormErrors(errors)) return;
          const body = procedureFormBody(form);
          void run(async () => {
            if (editingId) {
              const row = rows.find((candidate) => candidate.id === editingId);
              if (!row) throw new ProcedureRevisionConflict();
              return client.update(
                identity as ProcedureAccountIdentity,
                row,
                body,
              );
            }
            return client.create(identity as ProcedureAccountIdentity, body);
          }, describeRow);
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
        <button
          type="submit"
          className={ui.outline}
          disabled={busy || !permitted}
        >
          {editingId ? "Save new version" : "Create procedure"}
        </button>
        {editingId ? (
          <button
            type="button"
            className={ui.outline}
            disabled={busy}
            onClick={() => {
              setEditingId(null);
              setForm(emptyProcedureForm());
            }}
          >
            Cancel edit
          </button>
        ) : null}
      </form>
    </div>
  );
}
