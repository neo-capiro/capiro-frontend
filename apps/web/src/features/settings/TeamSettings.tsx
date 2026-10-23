"use client";

import { useEffect, useState } from "react";
import type { CapiroMe } from "../../shared/capiro/operations/settings-schemas";
import { useCapiroQuery } from "../../shared/capiro/queries";
import { DataTable, SelectInput, StatusPanel } from "../../shared/module-ui";
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
import { useSettingsMutation } from "./useSettingsMutation";
import { SettingsMutationNotice } from "./SettingsMutationNotice";
import { teamPermissions } from "./team-permissions";

const joinedDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export function TeamSettings({
  identity,
  refreshIdentity,
}: {
  identity: CapiroMe;
  refreshIdentity: () => void;
}) {
  const { api, action, pending, reconcile, locked } =
    useSettingsMutation("team");
  const members = useCapiroQuery("settings.team.list", {});
  const invitations = useCapiroQuery("settings.team.invitations", {});
  const [tab, setTab] = useState("members");
  const [invite, setInvite] = useState(false);
  const [remove, setRemove] = useState<{ userId: string; email: string }>();
  const refresh = () => {
    refreshIdentity();
    members.reload();
    invitations.reload();
  };
  const rows = members.data ?? [];
  useEffect(() => {
    if (action.error) refreshIdentity();
  }, [action.error, refreshIdentity]);
  const pendingInvitations = invitations.data ?? [];
  return (
    <div
      className={styles.stack}
      data-design-target={tab === "members" ? "1064:244607" : "1064:244732"}
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
                label: `Pending invitations (${pendingInvitations.length})`,
              },
            ]}
          />
        </div>
        <SettingsButton
          disabled={locked}
          primary
          onClick={() => setInvite(true)}
        >
          + Add team member
        </SettingsButton>
      </div>
      <SettingsMutationNotice
        pending={pending}
        busy={action.busy}
        reconcile={reconcile}
      />
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
          <div className={styles.teamCard}>
            <SettingsCard
              title="Members"
              description="Roles control what each person can open. Billing admins can view billing and invoices and add profiles."
            >
              <div className={styles.teamTable}>
                <DataTable
                  rows={rows}
                  rowKey={(row) => row.membershipId}
                  caption="Workspace members"
                  emptyMessage="No team members to display."
                  columns={[
                    {
                      key: "email",
                      label: "Email",
                      render: (row) => {
                        const name = [row.firstName, row.lastName]
                          .filter(Boolean)
                          .join(" ");
                        const initials =
                          [row.firstName?.[0], row.lastName?.[0]]
                            .filter(Boolean)
                            .join("") || row.email.slice(0, 2);
                        return (
                          <div className={styles.memberIdentity}>
                            <span
                              className={styles.memberAvatar}
                              aria-hidden="true"
                            >
                              {initials.toUpperCase()}
                            </span>
                            <span className={styles.memberDetails}>
                              <span className={styles.memberName}>
                                {name || row.email}
                              </span>
                              <span className={styles.memberEmail}>
                                {row.email}
                              </span>
                            </span>
                          </div>
                        );
                      },
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
                          <SelectInput
                            aria-label={`Role for ${row.email}`}
                            value={row.role}
                            disabled={
                              locked ||
                              !teamPermissions(identity, row).canChangeRole
                            }
                            options={[
                              {
                                value: "standard_user",
                                label: "Standard user",
                              },
                              { value: "user_admin", label: "User admin" },
                            ]}
                            onValueChange={(role) =>
                              void action.run(
                                (signal) =>
                                  api.request(
                                    "settings.team.setRole",
                                    {
                                      params: { userId: row.userId },
                                      body: {
                                        role: role as
                                          | "user_admin"
                                          | "standard_user",
                                      },
                                    },
                                    { signal },
                                  ),
                                "Member role was updated.",
                                refresh,
                              )
                            }
                          />
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
                              locked ||
                              row.role === "capiro_admin" ||
                              !(row.billingAdmin
                                ? teamPermissions(identity, row)
                                    .canRevokeBilling
                                : teamPermissions(identity, row)
                                    .canGrantBilling)
                            }
                            onChange={(billingAdmin) =>
                              void action.run(
                                (signal) =>
                                  api.request(
                                    "settings.team.setBillingAdmin",
                                    {
                                      params: { userId: row.userId },
                                      body: { billingAdmin },
                                    },
                                    { signal },
                                  ),
                                "Billing administrator access was updated.",
                                refresh,
                              )
                            }
                          />
                          {row.billingAdmin ? "On" : "Off"}
                          {teamPermissions(identity, row).reason && (
                            <small>
                              {teamPermissions(identity, row).reason}
                            </small>
                          )}
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
                          ? joinedDate.format(new Date(row.joinedAt))
                          : "—",
                    },
                    {
                      key: "actions",
                      label: "Actions",
                      visuallyHiddenHeader: true,
                      render: (row) =>
                        row.userId !== identity.user.id &&
                        row.role !== "capiro_admin" && (
                          <SettingsButton
                            danger
                            small
                            disabled={
                              locked ||
                              !teamPermissions(identity, row).canRemove
                            }
                            onClick={() => setRemove(row)}
                          >
                            Remove
                          </SettingsButton>
                        ),
                    },
                  ]}
                />
              </div>
            </SettingsCard>
          </div>
        </StatusPanel>
      ) : (
        <StatusPanel
          loading={invitations.loading}
          error={invitations.error}
          onRetry={invitations.reload}
        >
          <SettingsCard title="Pending invitations">
            <DataTable
              rows={pendingInvitations}
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
                  visuallyHiddenHeader: true,
                  render: (row) => (
                    <SettingsButton
                      small
                      disabled={locked}
                      onClick={() =>
                        void action.run(
                          (signal) =>
                            api.request(
                              "settings.team.resend",
                              {
                                params: { invitationId: row.id },
                              },
                              { signal },
                            ),
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
        busy={action.busy}
        open={!!remove}
        onClose={() => setRemove(undefined)}
        title="Remove team member"
        description="Remove this member’s access to your workspace."
        footer={
          <>
            <SettingsButton
              disabled={locked}
              onClick={() => setRemove(undefined)}
            >
              Cancel
            </SettingsButton>
            <SettingsButton
              danger
              disabled={locked}
              onClick={() => {
                if (remove)
                  void action.run(
                    (signal) =>
                      api.request(
                        "settings.team.remove",
                        {
                          params: { userId: remove.userId },
                        },
                        { signal },
                      ),
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
        <SettingsMutationNotice
          pending={pending}
          busy={action.busy}
          reconcile={reconcile}
        />
        {action.error && (
          <SettingsNotice title="Removal failed" error>
            {action.error}
          </SettingsNotice>
        )}
      </SettingsDialog>
    </div>
  );
}
