"use client";

import { useEffect, useState } from "react";
import type { CapiroMe } from "../../../shared/capiro/operations/settings-schemas";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import { useSettingsMutation } from "../useSettingsMutation";

export type TeamSettingsProps = {
  identity: CapiroMe;
  refreshIdentity: () => void;
  reportFailure: (error?: string) => void;
};

export function useTeamSettings({
  refreshIdentity,
  reportFailure,
}: TeamSettingsProps) {
  const mutation = useSettingsMutation("team");
  const { api, action } = mutation;
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
  useEffect(() => {
    if (action.error) {
      reportFailure(action.error);
      refreshIdentity();
    } else if (action.busy) reportFailure(undefined);
  }, [action.error, action.busy, refreshIdentity, reportFailure]);
  const changeRole = (userId: string, role: "user_admin" | "standard_user") =>
    action.run(
      (signal) =>
        api.request(
          "settings.team.setRole",
          { params: { userId }, body: { role } },
          { signal },
        ),
      "Member role was updated.",
      refresh,
    );
  const changeBilling = (userId: string, billingAdmin: boolean) =>
    action.run(
      (signal) =>
        api.request(
          "settings.team.setBillingAdmin",
          { params: { userId }, body: { billingAdmin } },
          { signal },
        ),
      "Billing administrator access was updated.",
      refresh,
    );
  const resend = (invitationId: string) =>
    action.run(
      (signal) =>
        api.request(
          "settings.team.resend",
          { params: { invitationId } },
          { signal },
        ),
      "Invitation was resent.",
      refresh,
    );
  return {
    ...mutation,
    members,
    invitations,
    tab,
    setTab,
    invite,
    setInvite,
    remove,
    setRemove,
    refresh,
    changeRole,
    changeBilling,
    resend,
  };
}

export type TeamModel = ReturnType<typeof useTeamSettings>;
export type TeamMember = NonNullable<TeamModel["members"]["data"]>[number];
