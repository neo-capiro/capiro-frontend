"use client";
import { useState } from "react";
import { TextArea } from "../../../shared/module-ui";
import { useImpersonationEntry } from "../../../shared/impersonation/context";
import {
  SettingField,
  SettingsButton,
  SettingsDialog,
  SettingsNotice,
} from "../components";
export function ImpersonationDialog({
  selected,
  onClose,
}: {
  selected: { id: string; slug: string; status: string };
  onClose: () => void;
}) {
  const impersonation = useImpersonationEntry();
  const [reason, setReason] = useState("");
  return (
    <SettingsDialog
      busy={impersonation?.busy ?? false}
      open
      onClose={onClose}
      title={`Impersonate ${selected?.slug ?? "tenant"}`}
      description="The reason is recorded in the audit log alongside your user ID."
      footer={
        <>
          <SettingsButton disabled={impersonation?.busy} onClick={onClose}>
            Cancel
          </SettingsButton>
          <SettingsButton
            primary
            disabled={
              !impersonation?.ready ||
              impersonation.busy ||
              reason.trim().length < 10 ||
              selected?.status !== "active"
            }
            onClick={() => {
              if (selected) void impersonation?.start(selected.id, reason);
            }}
          >
            Start impersonation
          </SettingsButton>
        </>
      }
    >
      <SettingField label="Reason">
        <TextArea
          placeholder="Investigating ticket #1234, invitation flow"
          minLength={10}
          maxLength={500}
          disabled={!impersonation?.ready || impersonation.busy}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </SettingField>
      <SettingsNotice title="Audited read-only support">
        Opens the tenant’s visible client roster for one hour. Personal
        settings, editing, approvals and other modules are unavailable while
        acting as the tenant.
      </SettingsNotice>
      {impersonation?.error && (
        <SettingsNotice title="Support session needs attention" error>
          {impersonation.error}
        </SettingsNotice>
      )}
    </SettingsDialog>
  );
}
