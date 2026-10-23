"use client";
import { SettingsButton, SettingsNotice } from "./components";
import type { SettingsWrite } from "./security-writes";
const labels: Record<string, string> = {
  "settings.team.invite": "Team invitation",
  "settings.team.resend": "Invitation resend",
  "settings.team.remove": "Member removal",
  "settings.team.setRole": "Member role change",
  "settings.team.setBillingAdmin": "Billing access change",
  "settings.hq.tenants.create": "Tenant creation",
  "settings.hq.tenants.resendInvitation": "Administrator invitation resend",
  "settings.hq.tenants.delete": "Tenant deletion",
  "settings.hq.customers.comp": "Complimentary access change",
  "settings.hq.ai.setCredential": "Provider key change",
  "settings.hq.ai.removeCredential": "Provider key removal",
  "settings.hq.ai.updateModel": "Provider model change",
  "settings.hq.broadcasts.send": "Broadcast send",
  "settings.hq.broadcasts.archive": "Broadcast archive",
};
export function SettingsMutationNotice({
  pending,
  busy,
  reconcile,
}: {
  pending?: SettingsWrite;
  busy: boolean;
  reconcile: () => void;
}) {
  if (!pending || busy) return null;
  return (
    <SettingsNotice title="Check the last change" error>
      <p>{labels[pending.operation] ?? "Settings change"}</p>
      <p>
        The service did not confirm the result. This change will not be
        submitted again. Check its current result before continuing.
      </p>
      <SettingsButton small onClick={reconcile}>
        Check current result
      </SettingsButton>
    </SettingsNotice>
  );
}
