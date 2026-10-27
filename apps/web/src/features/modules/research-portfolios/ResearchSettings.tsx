"use client";
import { useState } from "react";
import { useCapiro } from "../../../shared/capiro/CapiroBoundary";
import type { ResearchDetail } from "../../../shared/capiro/operations/research-schemas";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  ActionButton,
  DataTable,
  Field,
  Modal,
  Panel,
  TextArea,
  TextInput,
} from "../../../shared/module-ui";
import styles from "./research.module.css";
export function ResearchSettings({
  portfolio,
  onReload,
}: {
  portfolio: ResearchDetail;
  onReload: () => void;
}) {
  const api = useCapiro();
  const [name, setName] = useState(portfolio.name);
  const [purpose, setPurpose] = useState(portfolio.purpose || "");
  const [mode, setMode] = useState(portfolio.mode);
  const [clientId, setClientId] = useState("");
  const [userId, setUserId] = useState("");
  const [grantRole, setGrantRole] = useState<"owner" | "editor" | "viewer">(
    "viewer",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [warning, setWarning] = useState<{
    title: string;
    proceed: () => Promise<unknown>;
  }>();
  const clients = useCapiroQuery("clients.list", {});
  const team = useCapiroQuery("settings.tenantMembers", {});
  const sharing = useCapiroQuery("research.sharing", {
    params: { id: portfolio.id },
  });
  const activeLinks = sharing.data?.activeLinkCount ?? 0;
  const editable = portfolio.myRole !== "viewer";
  /** Active client links stay live through unlinking or archiving (FR-16.22): warn, never block. */
  function guarded(title: string, action: () => Promise<unknown>) {
    if (activeLinks > 0) setWarning({ title, proceed: action });
    else void run(action);
  }
  const metadata = () => ({
    expectedRevision: portfolio.revision,
    idempotencyKey: crypto.randomUUID(),
  });
  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(undefined);
    try {
      await action();
      onReload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save changes");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={styles.stack}>
      {error && (
        <p role="alert">
          {error}{" "}
          <ActionButton onClick={onReload}>Reload portfolio</ActionButton>
        </p>
      )}
      <Panel title="Portfolio settings">
        <div className={`${styles.content} ${styles.form}`}>
          <Field label="Name" htmlFor="research-name">
            <TextInput
              id="research-name"
              disabled={!editable || busy}
              maxLength={240}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field label="Purpose" htmlFor="research-purpose">
            <TextArea
              id="research-purpose"
              disabled={!editable || busy}
              maxLength={4000}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
            />
          </Field>
          <Field label="Mode" htmlFor="research-mode">
            <select
              id="research-mode"
              className={styles.select}
              disabled={!editable || busy}
              value={mode}
              onChange={(e) => setMode(e.target.value as typeof mode)}
            >
              {["manual", "rules", "hybrid"].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </Field>
          <ActionButton
            primary
            disabled={!editable || busy || !name.trim()}
            onClick={() =>
              run(() =>
                api.request("research.update", {
                  params: { id: portfolio.id },
                  body: { ...metadata(), name, purpose: purpose || null, mode },
                }),
              )
            }
          >
            Save settings
          </ActionButton>
          <ActionButton
            disabled={!editable || busy}
            onClick={() => {
              const request = () =>
                api.request(
                  portfolio.lifecycle === "active"
                    ? "research.archive"
                    : "research.restore",
                  { params: { id: portfolio.id }, body: metadata() },
                );
              if (portfolio.lifecycle === "active")
                guarded("Archive this portfolio?", request);
              else void run(request);
            }}
          >
            {portfolio.lifecycle === "active"
              ? "Archive portfolio"
              : "Restore portfolio"}
          </ActionButton>
        </div>
      </Panel>
      <Panel title="Linked clients">
        <DataTable
          rows={portfolio.clientLinks}
          rowKey={(r) => r.id}
          caption="Linked clients"
          columns={[
            { key: "client", label: "Client", render: (r) => r.clientName },
            {
              key: "action",
              label: "Action",
              render: (r) => (
                <ActionButton
                  disabled={!editable || busy}
                  onClick={() =>
                    guarded(`Unlink ${r.clientName}?`, () =>
                      api.request("research.clients.unlink", {
                        params: { id: portfolio.id, clientId: r.clientId },
                        body: metadata(),
                      }),
                    )
                  }
                >
                  Unlink
                </ActionButton>
              ),
            },
          ]}
        />
        <div className={styles.actions}>
          <select
            className={styles.select}
            aria-label="Client to link"
            disabled={!editable || busy}
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          >
            <option value="">Choose client</option>
            {clients.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <ActionButton
            disabled={!editable || busy || !clientId}
            onClick={() =>
              run(() =>
                api.request("research.clients.link", {
                  params: { id: portfolio.id },
                  body: { ...metadata(), clientId },
                }),
              )
            }
          >
            Link client
          </ActionButton>
        </div>
      </Panel>
      <Modal
        open={Boolean(warning)}
        onOpenChange={(open) => {
          if (!open) setWarning(undefined);
        }}
        title={warning?.title ?? ""}
        description={`${activeLinks} active client link${activeLinks === 1 ? "" : "s"} will keep working until expiry or revoke. Revoke them on the Sharing tab if that is not what you want.`}
        footer={
          <ActionButton
            primary
            disabled={busy}
            onClick={async () => {
              const proceed = warning?.proceed;
              setWarning(undefined);
              if (proceed) await run(proceed);
            }}
          >
            Continue
          </ActionButton>
        }
      >
        <p>Links are ended only by expiry or a revoke, never by this change.</p>
      </Modal>
      <Panel title="Access grants">
        <DataTable
          rows={portfolio.grants}
          rowKey={(r) => r.id}
          caption="Research portfolio access grants"
          columns={[
            {
              key: "user",
              label: "Team member",
              render: (r) =>
                team.data?.find((u) => u.id === r.principalUserId)?.name ||
                r.principalUserId,
            },
            { key: "role", label: "Role", render: (r) => r.role },
            {
              key: "action",
              label: "Action",
              render: (r) => (
                <ActionButton
                  disabled={
                    portfolio.myRole !== "owner" || busy || r.role === "owner"
                  }
                  onClick={() =>
                    run(() =>
                      api.request("research.grants.remove", {
                        params: {
                          id: portfolio.id,
                          principalId: r.principalUserId,
                        },
                        body: metadata(),
                      }),
                    )
                  }
                >
                  Remove
                </ActionButton>
              ),
            },
          ]}
        />
        <div className={styles.actions}>
          <select
            className={styles.select}
            aria-label="Team member"
            disabled={portfolio.myRole !== "owner" || busy}
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          >
            <option value="">Choose team member</option>
            {team.data?.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name || u.email}
              </option>
            ))}
          </select>
          <select
            className={styles.select}
            aria-label="Grant role"
            value={grantRole}
            onChange={(e) => setGrantRole(e.target.value as typeof grantRole)}
            disabled={portfolio.myRole !== "owner" || busy}
          >
            {["viewer", "editor", "owner"].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
          <ActionButton
            disabled={portfolio.myRole !== "owner" || busy || !userId}
            onClick={() =>
              run(() =>
                api.request("research.grants.put", {
                  params: { id: portfolio.id, principalId: userId },
                  body: {
                    ...metadata(),
                    principalType: "user",
                    role: grantRole,
                  },
                }),
              )
            }
          >
            Save grant
          </ActionButton>
        </div>
      </Panel>
    </div>
  );
}
