import type { CapiroMe } from "../../../shared/capiro/operations/settings-schemas";
import { DataTable, StatusPanel } from "../../../shared/module-ui";
import { SettingsButton, SettingsCard, SettingsTabs } from "../components";
import styles from "../styles";
import { teamMemberColumns } from "./TeamMemberCells";
import type { TeamModel } from "./useTeamSettings";

export function TeamListTabs({ model }: { model: TeamModel }) {
  return (
    <div className={styles.row}>
      <div className={styles.grow}>
        <SettingsTabs
          label="Team lists"
          value={model.tab}
          onChange={model.setTab}
          items={[
            {
              id: "members",
              label: `Members (${model.members.data?.length ?? 0})`,
            },
            {
              id: "invitations",
              label: `Pending invitations (${model.invitations.data?.length ?? 0})`,
            },
          ]}
        />
      </div>
      <SettingsButton
        disabled={model.locked}
        primary
        onClick={() => model.setInvite(true)}
      >
        + Add team member
      </SettingsButton>
    </div>
  );
}

export function TeamMembers({
  model,
  identity,
}: {
  model: TeamModel;
  identity: CapiroMe;
}) {
  const { members } = model;
  return (
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
              rows={members.data ?? []}
              rowKey={(row) => row.membershipId}
              caption="Workspace members"
              emptyMessage="No team members to display."
              columns={teamMemberColumns(identity, model)}
            />
          </div>
        </SettingsCard>
      </div>
    </StatusPanel>
  );
}

export function TeamInvitations({ model }: { model: TeamModel }) {
  const { invitations, locked } = model;
  return (
    <StatusPanel
      loading={invitations.loading}
      error={invitations.error}
      onRetry={invitations.reload}
    >
      <SettingsCard title="Pending invitations">
        <DataTable
          rows={invitations.data ?? []}
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
                  onClick={() => void model.resend(row.id)}
                >
                  Resend invitation
                </SettingsButton>
              ),
            },
          ]}
        />
      </SettingsCard>
    </StatusPanel>
  );
}
