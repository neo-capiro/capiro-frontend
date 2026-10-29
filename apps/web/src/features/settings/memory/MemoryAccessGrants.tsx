"use client";
import { useState } from "react";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import { DataTable, StatusPanel } from "../../../shared/module-ui";
import { SettingField, SettingsButton, SettingsNotice } from "../components";
import { SettingsMutationNotice } from "../SettingsMutationNotice";
import { useSettingsMutation } from "../useSettingsMutation";
import { grantStatus } from "./grant-reconciliation";
import styles from "../styles";

export function MemoryAccessGrants({
  readOnly = false,
}: {
  readOnly?: boolean;
}) {
  const clients = useCapiroQuery("clients.list", {});
  const [clientId, setClientId] = useState("");
  const selected = clients.data?.find(
    (client) => client.id === clientId && client.status !== "archived",
  );
  return (
    <section aria-label="Memory access grants">
      <StatusPanel
        loading={clients.loading}
        error={clients.error}
        onRetry={clients.reload}
      >
        <SettingField label="Client">
          <select
            className={styles.input}
            value={selected ? clientId : ""}
            onChange={(event) => setClientId(event.target.value)}
          >
            <option value="">Choose a permitted client</option>
            {clients.data
              ?.filter((client) => client.status !== "archived")
              .map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
          </select>
        </SettingField>
        {selected && (
          <ClientGrants
            key={selected.id}
            clientId={selected.id}
            readOnly={readOnly}
          />
        )}
      </StatusPanel>
      <p className={styles.description}>
        These are explicit governed-memory permissions. Inherited role access
        and confidentiality-wall membership are separate; a grant never bypasses
        a wall.
      </p>
    </section>
  );
}

function ClientGrants({
  clientId,
  readOnly,
}: {
  clientId: string;
  readOnly: boolean;
}) {
  const rows = useCapiroQuery("settings.memory.grants.list", {
    params: { clientId },
  });
  const team = useCapiroQuery("settings.team.list", {});
  const vocabulary = useCapiroQuery("settings.memory.grants.permissions", {});
  const { api, action, pending, reconcile, locked } =
    useSettingsMutation("memory-grants");
  const [userId, setUserId] = useState("");
  const [permissions, setPermissions] = useState<
    NonNullable<typeof vocabulary.data>["permissions"]
  >([]);
  const [reason, setReason] = useState("");
  const [expiry, setExpiry] = useState("");
  const activeMembers =
    team.data?.filter((member) => member.status === "active") ?? [];
  const canCreate =
    !readOnly &&
    !locked &&
    !!rows.data &&
    !rows.error &&
    !team.loading &&
    !team.error &&
    !!vocabulary.data &&
    !vocabulary.error &&
    activeMembers.some((member) => member.userId === userId) &&
    permissions.length > 0 &&
    !!reason.trim() &&
    Date.parse(expiry) > Date.now();
  return (
    <>
      <StatusPanel
        loading={rows.loading}
        error={rows.error}
        onRetry={rows.reload}
      >
        {rows.data && (
          <DataTable
            caption="Explicit memory grants"
            rows={rows.data.grants}
            rowKey={(row) => row.id}
            emptyMessage="No explicit grants exist for this client."
            columns={[
              {
                key: "user",
                label: "Member",
                render: (row) =>
                  team.data?.find((member) => member.userId === row.userId)
                    ?.email ?? "Member unavailable",
              },
              {
                key: "permissions",
                label: "Permissions",
                render: (row) => row.permissions.join(", "),
              },
              {
                key: "status",
                label: "Status",
                render: (row) => grantStatus(row),
              },
              {
                key: "expires",
                label: "Expires",
                render: (row) => row.expiresAt ?? "No recorded expiry",
              },
              {
                key: "reason",
                label: "Reason",
                render: (row) => row.reason ?? "No recorded reason",
              },
              {
                key: "action",
                label: "Action",
                render: (row) => (
                  <SettingsButton
                    small
                    disabled={
                      readOnly ||
                      locked ||
                      row.status !== "active" ||
                      !!row.revokedAt
                    }
                    onClick={() =>
                      void action.run(
                        (signal) =>
                          api.request(
                            "settings.memory.grants.revoke",
                            { params: { clientId, userId: row.userId } },
                            { signal },
                          ),
                        "Revocation confirmed by current grant readback.",
                        rows.reload,
                      )
                    }
                  >
                    Revoke
                  </SettingsButton>
                ),
              },
            ]}
          />
        )}
      </StatusPanel>
      {(team.error || vocabulary.error) && (
        <SettingsNotice error title="Grant choices unavailable">
          Members and permissions must be verified before creating a grant.{" "}
          <button
            type="button"
            onClick={() => {
              team.reload();
              vocabulary.reload();
            }}
          >
            Reload choices
          </button>
        </SettingsNotice>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!canCreate) return;
          const body = {
            id: crypto.randomUUID(),
            userId,
            permissions: [...permissions].sort(),
            reason: reason.trim(),
            expiresAt: new Date(expiry).toISOString(),
          };
          void action.run(
            (signal) =>
              api.request(
                "settings.memory.grants.create",
                { params: { clientId }, body },
                { signal },
              ),
            "Grant recorded and read back. Check its current status below.",
            rows.reload,
          );
        }}
      >
        <fieldset disabled={readOnly || locked} className={styles.stack}>
          <legend>Add or replace an explicit grant</legend>
          <SettingField label="Active tenant member">
            <select
              className={styles.input}
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              required
            >
              <option value="">Choose an active member</option>
              {activeMembers.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.email}
                </option>
              ))}
            </select>
          </SettingField>
          <SettingField label="Permissions">
            <select
              className={styles.input}
              multiple
              value={permissions}
              onChange={(event) =>
                setPermissions(
                  Array.from(
                    event.target.selectedOptions,
                    (option) => option.value,
                  ) as typeof permissions,
                )
              }
              required
            >
              {vocabulary.data?.permissions.map((value) => (
                <option key={value} value={value}>
                  {value.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </SettingField>
          <SettingField label="Reason">
            <input
              className={styles.input}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={500}
              required
            />
          </SettingField>
          <SettingField label="Expires at (your local time)">
            <input
              className={styles.input}
              type="datetime-local"
              value={expiry}
              onChange={(event) => setExpiry(event.target.value)}
              required
            />
          </SettingField>
          <SettingsButton primary type="submit" disabled={!canCreate}>
            Save grant
          </SettingsButton>
        </fieldset>
      </form>
      <SettingsMutationNotice
        pending={pending}
        busy={action.busy}
        reconcile={() => void reconcile().then(rows.reload)}
      />
      {action.error && (
        <SettingsNotice error title="Grant change not confirmed">
          {action.error}
        </SettingsNotice>
      )}
      {action.message && <SettingsNotice title={action.message} />}
    </>
  );
}
