"use client";

import { useState } from "react";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  Badge,
  DataTable,
  StatusPanel,
  TextArea,
  TextInput,
} from "../../../shared/module-ui";
import {
  SettingField,
  SettingsButton,
  SettingsCard,
  SettingsDialog,
  SettingsNotice,
  SettingsTabs,
} from "../components";
import styles from "../styles";
import { useSettingsMutation } from "../useSettingsMutation";
import { SettingsMutationNotice } from "../SettingsMutationNotice";
import { BroadcastDetail } from "./BroadcastDetail";

export function BroadcastSettings() {
  const { api, action, pending, reconcile, locked } =
    useSettingsMutation("hq-broadcasts");
  const tenants = useCapiroQuery("settings.hq.tenants.list", {});
  const [tenantId, setTenantId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("all_users");
  const [userIds, setUserIds] = useState<string[]>([]);
  const [confirm, setConfirm] = useState(false);
  const [selected, setSelected] = useState<string>();
  const members = useCapiroQuery(
    "settings.hq.broadcasts.members",
    { query: { tenantId } },
    { enabled: !!tenantId },
  );
  const broadcasts = useCapiroQuery(
    "settings.hq.broadcasts.list",
    { query: { tenantId } },
    { enabled: !!tenantId },
  );
  const tenant = tenants.data?.find((item) => item.id === tenantId);
  const activeMembers = (members.data ?? []).filter(
    (member) => member.status === "active",
  );
  const count =
    audience === "all_users" ? activeMembers.length : userIds.length;
  function changeTenant(next: string) {
    setTenantId(next);
    setUserIds([]);
    setConfirm(false);
    setSelected(undefined);
    action.clear();
  }
  return (
    <div className={styles.stack} data-design-target="411:76476">
      <p className={styles.description}>
        Send a message to a tenant’s users. It appears the next time each person
        signs in and stays until acknowledged.
      </p>
      <SettingsCard
        title="Tenant"
        description="Choose the firm this broadcast is for."
      >
        <StatusPanel
          loading={tenants.loading}
          error={tenants.error}
          onRetry={tenants.reload}
        >
          <select
            disabled={locked}
            className={styles.input}
            aria-label="Broadcast tenant"
            value={tenantId}
            onChange={(event) => changeTenant(event.target.value)}
          >
            <option value="">Pick a tenant</option>
            {(tenants.data ?? []).map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {item.slug} · {item._count.memberships} members
              </option>
            ))}
          </select>
        </StatusPanel>
      </SettingsCard>
      {!tenantId && (
        <SettingsNotice title="Pick a tenant">
          Choose the tenant before composing a broadcast.
        </SettingsNotice>
      )}
      {tenantId && (
        <div className={`${styles.grid} ${styles.two}`}>
          <SettingsCard title="New broadcast">
            <form
              className={styles.stack}
              id="compose-broadcast"
              onSubmit={(event) => {
                event.preventDefault();
                setConfirm(true);
              }}
            >
              <SettingField label="Title *">
                <TextInput
                  disabled={locked}
                  required
                  maxLength={200}
                  value={title}
                  placeholder="Scheduled maintenance this Friday"
                  onChange={(event) => setTitle(event.target.value)}
                />
              </SettingField>
              <SettingField label={`Message * · ${body.length} / 5000`}>
                <TextArea
                  disabled={locked}
                  required
                  maxLength={5000}
                  value={body}
                  placeholder="What do these users need to know?"
                  onChange={(event) => setBody(event.target.value)}
                />
              </SettingField>
              <h3>Recipients</h3>
              <SettingsTabs
                label="Broadcast recipients"
                value={audience}
                onChange={(value) => {
                  if (!locked) setAudience(value);
                }}
                items={[
                  {
                    id: "all_users",
                    label: `Entire firm (${activeMembers.length})`,
                  },
                  { id: "selected_users", label: "Specific users" },
                ]}
              />
              <StatusPanel
                loading={members.loading}
                error={members.error}
                onRetry={members.reload}
              >
                {audience === "selected_users" &&
                  activeMembers.map((member) => (
                    <label key={member.userId} className={styles.check}>
                      <input
                        disabled={locked}
                        type="checkbox"
                        checked={userIds.includes(member.userId)}
                        onChange={(event) =>
                          setUserIds((current) =>
                            event.target.checked
                              ? [...current, member.userId]
                              : current.filter((id) => id !== member.userId),
                          )
                        }
                      />
                      <span>
                        {[member.firstName, member.lastName]
                          .filter(Boolean)
                          .join(" ") || member.email}
                        <br />
                        <span className={styles.description}>
                          {member.email}
                        </span>
                      </span>
                    </label>
                  ))}
              </StatusPanel>
              <div className={styles.row}>
                <p className={`${styles.description} ${styles.grow}`}>
                  {count} recipients
                </p>
                <SettingsButton
                  primary
                  type="submit"
                  disabled={
                    locked || !count || members.loading || !!members.error
                  }
                >
                  Send broadcast
                </SettingsButton>
              </div>
            </form>
          </SettingsCard>
          <SettingsCard
            title="Sent broadcasts"
            action={
              <SettingsButton
                disabled={locked}
                small
                onClick={broadcasts.reload}
              >
                Refresh
              </SettingsButton>
            }
          >
            <StatusPanel
              loading={broadcasts.loading}
              error={broadcasts.error}
              onRetry={broadcasts.reload}
            >
              <DataTable
                rows={broadcasts.data ?? []}
                rowKey={(row) => row.id}
                caption="Sent tenant broadcasts"
                columns={[
                  {
                    key: "title",
                    label: "Title",
                    render: (row) => (
                      <div>
                        {row.title}
                        <p className={styles.description}>
                          {new Date(row.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ),
                  },
                  {
                    key: "recipients",
                    label: "Recipients",
                    render: (row) =>
                      `${row.audience === "all_users" ? "Entire firm" : "Selected"} · ${row.recipientCount}`,
                  },
                  {
                    key: "ack",
                    label: "Acknowledged",
                    render: (row) =>
                      row.recipientCount
                        ? `${Math.round((100 * row.acknowledgedCount) / row.recipientCount)}%`
                        : "—",
                  },
                  {
                    key: "status",
                    label: "Status",
                    render: (row) => (
                      <Badge
                        tone={
                          !row.archivedAt &&
                          row.acknowledgedCount === row.recipientCount
                            ? "success"
                            : "neutral"
                        }
                      >
                        {row.archivedAt
                          ? "Archived"
                          : row.acknowledgedCount === row.recipientCount
                            ? "All acknowledged"
                            : `Awaiting ${row.recipientCount - row.acknowledgedCount}`}
                      </Badge>
                    ),
                  },
                  {
                    key: "view",
                    label: "Actions",
                    render: (row) => (
                      <SettingsButton
                        disabled={locked}
                        small
                        onClick={() => setSelected(row.id)}
                      >
                        View
                      </SettingsButton>
                    ),
                  },
                ]}
              />
            </StatusPanel>
          </SettingsCard>
        </div>
      )}
      <SettingsMutationNotice
        pending={pending}
        busy={action.busy}
        reconcile={reconcile}
      />
      {action.error && (
        <SettingsNotice title="Broadcast action failed" error>
          {action.error}
        </SettingsNotice>
      )}
      {action.message && <SettingsNotice title={action.message} />}
      <SettingsDialog
        busy={action.busy}
        open={confirm}
        onClose={() => setConfirm(false)}
        title={`Send to ${count} users of ${tenant?.name ?? "this tenant"}?`}
        description="This message will appear at their next sign-in and remain until each person acknowledges it."
        footer={
          <>
            <SettingsButton disabled={locked} onClick={() => setConfirm(false)}>
              Cancel
            </SettingsButton>
            <SettingsButton
              primary
              disabled={locked || !count}
              onClick={() =>
                void action.run(
                  (signal) =>
                    api.request(
                      "settings.hq.broadcasts.send",
                      {
                        body: {
                          tenantId,
                          title,
                          body,
                          audience: audience as "all_users" | "selected_users",
                          ...(audience === "selected_users" ? { userIds } : {}),
                        },
                      },
                      { signal },
                    ),
                  "Broadcast was sent.",
                  () => {
                    setConfirm(false);
                    setTitle("");
                    setBody("");
                    setUserIds([]);
                    broadcasts.reload();
                  },
                )
              }
            >
              {action.busy ? "Sending…" : "Send now"}
            </SettingsButton>
          </>
        }
      >
        <h3>{title}</h3>
        <p style={{ whiteSpace: "pre-wrap" }}>{body}</p>
        <SettingsMutationNotice
          pending={pending}
          busy={action.busy}
          reconcile={reconcile}
        />
        {action.error && (
          <SettingsNotice title="Broadcast could not be sent" error>
            {action.error}
          </SettingsNotice>
        )}
      </SettingsDialog>
      {selected && (
        <BroadcastDetail
          id={selected}
          onClose={() => setSelected(undefined)}
          refresh={broadcasts.reload}
        />
      )}
    </div>
  );
}
