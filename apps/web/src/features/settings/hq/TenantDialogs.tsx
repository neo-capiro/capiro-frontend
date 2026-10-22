"use client";
import { useState } from "react";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import { DataTable, StatusPanel, TextInput } from "../../../shared/module-ui";
import {
  SettingField,
  SettingsButton,
  SettingsDialog,
  SettingsNotice,
} from "../components";
import styles from "../styles";
import { useSettingsMutation } from "../useSettingsMutation";
import { SettingsMutationNotice } from "../SettingsMutationNotice";

export function CreateTenant({
  open,
  onClose,
  refresh,
}: {
  open: boolean;
  onClose: () => void;
  refresh: () => void;
}) {
  const { api, action, pending, reconcile, locked } =
    useSettingsMutation("hq-tenant-dialogs");
  const [form, setForm] = useState({
    slug: "",
    name: "",
    adminEmail: "",
    adminFirstName: "",
    adminLastName: "",
  });
  return (
    <SettingsDialog
      busy={action.busy}
      open={open}
      onClose={onClose}
      title="Create tenant + invite admin"
      footer={
        <>
          <SettingsButton onClick={onClose} disabled={locked}>
            Cancel
          </SettingsButton>
          <SettingsButton
            primary
            form="create-capiro-tenant"
            type="submit"
            disabled={locked}
          >
            Create + send invite
          </SettingsButton>
        </>
      }
    >
      <form
        id="create-capiro-tenant"
        className={styles.stack}
        onSubmit={(event) => {
          event.preventDefault();
          const { adminFirstName, adminLastName, ...required } = form;
          void action.run(
            (signal) =>
              api.request(
                "settings.hq.tenants.create",
                {
                  body: {
                    ...required,
                    ...(adminFirstName ? { adminFirstName } : {}),
                    ...(adminLastName ? { adminLastName } : {}),
                  },
                },
                { signal },
              ),
            "Tenant was created and invitation was sent.",
            () => {
              refresh();
              onClose();
              setForm({
                slug: "",
                name: "",
                adminEmail: "",
                adminFirstName: "",
                adminLastName: "",
              });
            },
          );
        }}
      >
        {(
          [
            ["slug", "Tenant slug"],
            ["name", "Display name"],
            ["adminFirstName", "Admin first name"],
            ["adminLastName", "Admin last name"],
            ["adminEmail", "Admin email"],
          ] as const
        ).map(([key, label]) => (
          <SettingField key={key} label={label}>
            <TextInput
              disabled={locked}
              value={form[key]}
              required={["slug", "name", "adminEmail"].includes(key)}
              type={key === "adminEmail" ? "email" : "text"}
              pattern={key === "slug" ? "[a-z0-9][a-z0-9-]*" : undefined}
              minLength={key === "slug" || key === "name" ? 2 : undefined}
              maxLength={key === "slug" ? 63 : 200}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  [key]: event.target.value,
                }))
              }
            />
          </SettingField>
        ))}
        <p className={styles.description}>
          An onboarding invitation email is sent to this address.
        </p>
        <SettingsMutationNotice
          pending={pending}
          busy={action.busy}
          reconcile={reconcile}
        />
        {action.error && (
          <SettingsNotice title="Tenant could not be created" error>
            {action.error}
          </SettingsNotice>
        )}
      </form>
    </SettingsDialog>
  );
}

export function TenantDetails({
  tenantId,
  onClose,
}: {
  tenantId: string;
  onClose: () => void;
}) {
  const { api, action, pending, reconcile, locked } = useSettingsMutation(
    `hq-tenant-details:${tenantId}`,
  );
  const query = useCapiroQuery("settings.hq.tenants.detail", {
    params: { tenantId },
  });
  return (
    <SettingsDialog
      busy={action.busy}
      open
      onClose={onClose}
      title={query.data?.name ?? "Tenant details"}
    >
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        <DataTable
          rows={query.data?.memberships ?? []}
          rowKey={(row) => row.id}
          caption="Tenant membership details"
          columns={[
            {
              key: "name",
              label: "Name",
              render: (row) =>
                [row.user.firstName, row.user.lastName]
                  .filter(Boolean)
                  .join(" ") || row.user.email,
            },
            { key: "role", label: "Role", render: (row) => row.role },
            { key: "status", label: "Status", render: (row) => row.status },
            {
              key: "resend",
              label: "Actions",
              render: (row) =>
                row.status === "invited" && (
                  <SettingsButton
                    small
                    disabled={locked}
                    onClick={() =>
                      void action.run(
                        (signal) =>
                          api.request(
                            "settings.hq.tenants.resendInvitation",
                            {
                              params: { tenantId },
                              body: { email: row.user.email },
                            },
                            { signal },
                          ),
                        "Admin invitation was resent.",
                      )
                    }
                  >
                    Resend admin invitation
                  </SettingsButton>
                ),
            },
          ]}
        />
        <SettingsMutationNotice
          pending={pending}
          busy={action.busy}
          reconcile={reconcile}
        />
        {action.error && (
          <SettingsNotice title="Invitation action failed" error>
            {action.error}
          </SettingsNotice>
        )}
        {action.message && <SettingsNotice title={action.message} />}
      </StatusPanel>
    </SettingsDialog>
  );
}
