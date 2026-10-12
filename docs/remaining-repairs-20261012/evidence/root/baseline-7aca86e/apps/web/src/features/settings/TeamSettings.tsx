"use client";

import { useState } from "react";
import { useCapiro } from "../../shared/capiro/CapiroBoundary";
import type { CapiroMe } from "../../shared/capiro/operations/settings-schemas";
import { useCapiroQuery } from "../../shared/capiro/queries";
import { DataTable, StatusPanel } from "../../shared/module-ui";
import {
  SettingsBadge,
  SettingsButton,
  SettingsCard,
  SettingsDialog,
  SettingsNotice,
  SettingsSwitch,
  SettingsTabs,
} from "./components";
import { InviteMember } from "./InviteMember";
import styles from "./styles";
import { useSettingsAction } from "./useSettingsAction";

export function TeamSettings({ identity }: { identity: CapiroMe }) {
  const api = useCapiro();
  const members = useCapiroQuery("settings.team.list", {});
  const invitations = useCapiroQuery("settings.team.invitations", {});
  const [tab, setTab] = useState("members");
  const [invite, setInvite] = useState(false);
  const [remove, setRemove] = useState<{ userId: string; email: string }>();
  const action = useSettingsAction();
  const refresh = () => {
    members.reload();
    invitations.reload();
  };
  const rows = members.data ?? [];
  const pending = invitations.data ?? [];
  return (
    <div
      className={styles.stack}
      data-design-target={tab === "members" ? "411:70590" : "411:70715"}
    >
      <div className={styles.row}>
        <div className={styles.grow}>
          <SettingsTabs
            label="Team lists"
            value={tab}
            onChange={setTab}
            items={[
              { id: "members", label: `Members (${rows.length})` },
              {
                id: "invitations",
                label: `Pending invitations (${pending.length})`,
              },
            ]}
          />
        </div>
        <SettingsButton primary onClick={() => setInvite(true)}>
          + Add team member
        </SettingsButton>
      </div>
      {action.error && (
        <SettingsNotice title="Team update failed" error>
          {action.error}
        </SettingsNotice>
      )}
      {action.message && <SettingsNotice title={action.message} />}
      {tab === "members" ? (
        <StatusPanel
          loading={members.loading}
          error={members.error}
          onRetry={members.reload}
        >
          <SettingsCard
            title="Members"
            description="Roles control what each person can open. Billing admins can view billing and invoices and add profiles."
          >
            <DataTable
              rows={rows}
              rowKey={(row) => row.membershipId}
              caption="Workspace members"
              emptyMessage="No team members to display."
              columns={[
                {
                  key: "email",
                  label: "Email",
                  render: (row) => (
                    <div>
                      {[row.firstName, row.lastName]
                        .filter(Boolean)
                        .join(" ") || row.email}
                      <p className={styles.description}>{row.email}</p>
                    </div>
                  ),
                },
                {
                  key: "role",
                  label: "Role",
                  render: (row) =>
                    row.userId === identity.user.id ||
                    row.role === "capiro_admin" ? (
                      <SettingsBadge>
                        {row.role
                          .replaceAll("_", " ")
                          .replace(/^./, (character) =>
                            character.toUpperCase(),
                          )}
                      </SettingsBadge>
                    ) : (
                      <select
                        className={styles.input}
                        aria-label={`Role for ${row.email}`}
                        value={row.role}
                        disabled={action.busy}
                        onChange={(event) =>
                          void action.run(
                            () =>
                              api.request("settings.team.setRole", {
                                params: { userId: row.userId },
                                body: {
                                  role: event.target.value as
                                    | "user_admin"
                                    | "standard_user",
                                },
                              }),
                            "Member role was updated.",
                            refresh,
                          )
                        }
                      >
                        <option value="standard_user">Standard user</option>
                        <option value="user_admin">User admin</option>
                      </select>
                    ),
                },
                {
                  key: "billing",
                  label: "Billing",
                  render: (row) => (
                    <div className={styles.row}>
                      <SettingsSwitch
                        label={`Billing admin for ${row.email}`}
                        checked={row.billingAdmin}
                        disabled={
                          action.busy ||
                          row.role === "capiro_admin" ||
                          row.userId === identity.user.id
                        }
                        onChange={(billingAdmin) =>
                          void action.run(
                            () =>
                              api.request("settings.team.setBillingAdmin", {
                                params: { userId: row.userId },
                                body: { billingAdmin },
                              }),
                            "Billing administrator access was updated.",
                            refresh,
                          )
                        }
                      />
                      {row.billingAdmin ? "On" : "Off"}
                    </div>
                  ),
                },
                {
                  key: "status",
                  label: "Status",
                  render: (row) => (
                    <SettingsBadge
                      tone={row.status === "active" ? "success" : "neutral"}
                    >
                      {row.status.replace(/^./, (character) =>
                        character.toUpperCase(),
                      )}
                    </SettingsBadge>
                  ),
                },
                {
                  key: "joined",
                  label: "Joined",
                  render: (row) =>
                    row.joinedAt
                      ? new Date(row.joinedAt).toLocaleDateString()
                      : "—",
                },
                {
                  key: "actions",
                  label: "Actions",
                  render: (row) =>
                    row.userId !== identity.user.id &&
                    row.role !== "capiro_admin" && (
                      <SettingsButton
                        danger
                        small
                        disabled={action.busy}
                        onClick={() => setRemove(row)}
                      >
                        Remove
                      </SettingsButton>
                    ),
                },
              ]}
            />
          </SettingsCard>
        </StatusPanel>
      ) : (
        <StatusPanel
          loading={invitations.loading}
          error={invitations.error}
          onRetry={invitations.reload}
        >
          <SettingsCard title="Pending invitations">
            <DataTable
              rows={pending}
              rowKey={(row) => row.id}
              caption="Pending team invitations"
              emptyMessage="No pending invitations."
              columns={[
                { key: "email", label: "Email", render: (row) => row.email },
                {
                  key: "role",
                  label: "Role",
                  render: (row) =>
                    row.role
                      .replaceAll("_", " ")
                      .replace(/^./, (character) => character.toUpperCase()),
                },
                {
                  key: "sent",
                  label: "Sent",
                  render: (row) => new Date(row.createdAt).toLocaleDateString(),
                },
                {
                  key: "expires",
                  label: "Expires",
                  render: (row) =>
                    row.expiresAt
                      ? new Date(row.expiresAt).toLocaleDateString()
                      : "—",
                },
                {
                  key: "resend",
                  label: "Actions",
                  render: (row) => (
                    <SettingsButton
                      small
                      disabled={action.busy}
                      onClick={() =>
                        void action.run(
                          () =>
                            api.request("settings.team.resend", {
                              params: { invitationId: row.id },
                            }),
                          "Invitation was resent.",
                          refresh,
                        )
                      }
                    >
                      Resend invitation
                    </SettingsButton>
                  ),
                },
              ]}
            />
          </SettingsCard>
        </StatusPanel>
      )}
      <InviteMember
        open={invite}
        onClose={() => setInvite(false)}
        onDone={refresh}
      />
      <SettingsDialog
        open={!!remove}
        onClose={() => setRemove(undefined)}
        title="Remove team member"
        description="Remove this member’s access to your workspace."
        footer={
          <>
            <SettingsButton
              disabled={action.busy}
              onClick={() => setRemove(undefined)}
            >
              Cancel
            </SettingsButton>
            <SettingsButton
              danger
              disabled={action.busy}
              onClick={() => {
                if (remove)
                  void action.run(
                    () =>
                      api.request("settings.team.remove", {
                        params: { userId: remove.userId },
                      }),
                    "Removal was submitted.",
                    () => {
                      setRemove(undefined);
                      refresh();
                    },
                  );
              }}
            >
              {action.busy ? "Removing…" : "Remove member"}
            </SettingsButton>
          </>
        }
      >
        <p>{remove?.email}</p>
        {action.error && (
          <SettingsNotice title="Removal failed" error>
            {action.error}
          </SettingsNotice>
        )}
      </SettingsDialog>
    </div>
  );
}
