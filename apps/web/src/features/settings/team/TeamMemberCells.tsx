import type { CapiroMe } from "../../../shared/capiro/operations/settings-schemas";
import { SelectInput, type TableColumn } from "../../../shared/module-ui";
import { SettingsBadge, SettingsButton, SettingsSwitch } from "../components";
import { teamPermissions } from "../team-permissions";
import styles from "../styles";
import type { TeamMember, TeamModel } from "./useTeamSettings";

export function TeamMemberIdentity({ member }: { member: TeamMember }) {
  const name = [member.firstName, member.lastName].filter(Boolean).join(" ");
  const initials =
    [member.firstName?.[0], member.lastName?.[0]].filter(Boolean).join("") ||
    member.email.slice(0, 2);
  return (
    <div className={styles.memberIdentity}>
      <span className={styles.memberAvatar} aria-hidden="true">
        {initials.toUpperCase()}
      </span>
      <span className={styles.memberDetails}>
        <span className={styles.memberName}>{name || member.email}</span>
        <span className={styles.memberEmail}>{member.email}</span>
      </span>
    </div>
  );
}

export function TeamMemberRole({
  member,
  identity,
  model,
}: {
  member: TeamMember;
  identity: CapiroMe;
  model: TeamModel;
}) {
  if (member.userId === identity.user.id || member.role === "capiro_admin")
    return (
      <SettingsBadge>
        {member.role
          .replaceAll("_", " ")
          .replace(/^./, (character) => character.toUpperCase())}
      </SettingsBadge>
    );
  return (
    <SelectInput
      aria-label={`Role for ${member.email}`}
      value={member.role}
      disabled={
        model.locked || !teamPermissions(identity, member).canChangeRole
      }
      options={[
        { value: "standard_user", label: "Standard user" },
        { value: "user_admin", label: "User admin" },
      ]}
      onValueChange={(role) =>
        void model.changeRole(
          member.userId,
          role as "user_admin" | "standard_user",
        )
      }
    />
  );
}

export function TeamMemberBilling({
  member,
  identity,
  model,
}: {
  member: TeamMember;
  identity: CapiroMe;
  model: TeamModel;
}) {
  const permissions = teamPermissions(identity, member);
  return (
    <div className={styles.row}>
      <SettingsSwitch
        label={`Billing admin for ${member.email}`}
        checked={member.billingAdmin}
        disabled={
          model.locked ||
          member.role === "capiro_admin" ||
          !(member.billingAdmin
            ? permissions.canRevokeBilling
            : permissions.canGrantBilling)
        }
        onChange={(billingAdmin) =>
          void model.changeBilling(member.userId, billingAdmin)
        }
      />
      {member.billingAdmin ? "On" : "Off"}
      {permissions.reason && <small>{permissions.reason}</small>}
    </div>
  );
}

const joinedDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export function teamMemberColumns(
  identity: CapiroMe,
  model: TeamModel,
): TableColumn<TeamMember>[] {
  const { locked } = model;
  return [
    {
      key: "email",
      label: "Email",
      render: (row) => <TeamMemberIdentity member={row} />,
    },
    {
      key: "role",
      label: "Role",
      render: (row) => (
        <TeamMemberRole member={row} identity={identity} model={model} />
      ),
    },
    {
      key: "billing",
      label: "Billing",
      render: (row) => (
        <TeamMemberBilling member={row} identity={identity} model={model} />
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <SettingsBadge tone={row.status === "active" ? "success" : "neutral"}>
          {row.status.replace(/^./, (character) => character.toUpperCase())}
        </SettingsBadge>
      ),
    },
    {
      key: "joined",
      label: "Joined",
      render: (row) =>
        row.joinedAt ? joinedDate.format(new Date(row.joinedAt)) : "—",
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
            disabled={locked || !teamPermissions(identity, row).canRemove}
            onClick={() => model.setRemove(row)}
          >
            Remove
          </SettingsButton>
        ),
    },
  ];
}
