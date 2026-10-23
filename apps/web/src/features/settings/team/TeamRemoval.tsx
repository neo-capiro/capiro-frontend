import { SettingsButton, SettingsDialog, SettingsNotice } from "../components";
import { SettingsMutationNotice } from "../SettingsMutationNotice";
import type { TeamModel } from "./useTeamSettings";

export function TeamRemoval({ model }: { model: TeamModel }) {
  const { api, action, locked, remove, setRemove, refresh } = model;
  const removeMember = () => {
    if (remove)
      void action.run(
        (signal) =>
          api.request(
            "settings.team.remove",
            { params: { userId: remove.userId } },
            { signal },
          ),
        "Removal was submitted.",
        () => {
          setRemove(undefined);
          refresh();
        },
      );
  };

  return (
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
          <SettingsButton danger disabled={locked} onClick={removeMember}>
            {action.busy ? "Removing…" : "Remove member"}
          </SettingsButton>
        </>
      }
    >
      <p>{remove?.email}</p>
      <SettingsMutationNotice
        pending={model.pending}
        busy={action.busy}
        reconcile={model.reconcile}
      />
      {action.error && (
        <SettingsNotice title="Removal failed" error>
          {action.error}
        </SettingsNotice>
      )}
    </SettingsDialog>
  );
}
