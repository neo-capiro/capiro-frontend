"use client";

import { SettingsNotice } from "./components";
import { InviteMember } from "./InviteMember";
import styles from "./styles";
import { SettingsMutationNotice } from "./SettingsMutationNotice";
import { TeamInvitations, TeamListTabs, TeamMembers } from "./team/TeamLists";
import { TeamRemoval } from "./team/TeamRemoval";
import {
  useTeamSettings,
  type TeamSettingsProps,
} from "./team/useTeamSettings";

export function TeamSettings(props: TeamSettingsProps) {
  const model = useTeamSettings(props);
  return (
    <div
      className={styles.stack}
      data-design-target={
        model.tab === "members" ? "1064:244607" : "1064:244732"
      }
    >
      <TeamListTabs model={model} />
      <SettingsMutationNotice
        pending={model.pending}
        busy={model.action.busy}
        reconcile={model.reconcile}
      />
      {model.action.message && <SettingsNotice title={model.action.message} />}
      {model.tab === "members" ? (
        <TeamMembers model={model} identity={props.identity} />
      ) : (
        <TeamInvitations model={model} />
      )}
      <InviteMember
        open={model.invite}
        onClose={() => model.setInvite(false)}
        onDone={model.refresh}
      />
      <TeamRemoval model={model} />
    </div>
  );
}
