"use client";

import { useState } from "react";
import type { z } from "zod";
import { useCapiro } from "../../../shared/capiro/CapiroBoundary";
import type { tenantListSchema } from "../../../shared/capiro/operations/settings-admin/schemas";
import type { CapiroMe } from "../../../shared/capiro/operations/settings-schemas";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  Badge,
  DataTable,
  StatusPanel,
  TextArea,
  TextInput,
} from "../../../shared/module-ui";
import {
  SettingField,
  SettingsButton,
  SettingsCard,
  SettingsDialog,
  SettingsNotice,
} from "../components";
import styles from "../styles";
import { useSettingsAction } from "../useSettingsAction";
import { CreateTenant, TenantDetails } from "./TenantDialogs";

type Tenant = z.infer<typeof tenantListSchema>;

export function TenantSettings({ identity }: { identity: CapiroMe }) {
  const api = useCapiro();
  const query = useCapiroQuery("settings.hq.tenants.list", {});
  const [create, setCreate] = useState(false);
  const [selected, setSelected] = useState<Tenant>();
  const [mode, setMode] = useState<"delete" | "impersonate" | "detail">(
    "detail",
  );
  const [confirmation, setConfirmation] = useState("");
  const action = useSettingsAction();
  const choose = (tenant: Tenant, next: typeof mode) => {
    setSelected(tenant);
    setMode(next);
    setConfirmation("");
    action.clear();
  };
  return (
    <div className={styles.stack} data-design-target="411:75020">
      <SettingsCard
        title="Tenants"
        action={
          <SettingsButton primary onClick={() => setCreate(true)}>
            + Create tenant
          </SettingsButton>
        }
      >
        <StatusPanel
          loading={query.loading}
          error={query.error}
          onRetry={query.reload}
        >
          <DataTable
            rows={query.data ?? []}
            rowKey={(row) => row.id}
            caption="Capiro tenants"
            columns={[
              {
                key: "slug",
                label: "Slug",
                render: (row) => (
                  <button
                    className={styles.button}
                    onClick={() => choose(row, "detail")}
                  >
                    {row.slug}
                  </button>
                ),
              },
              { key: "name", label: "Name", render: (row) => row.name },
              {
                key: "status",
                label: "Status",
                render: (row) => (
                  <Badge tone={row.status === "active" ? "success" : "neutral"}>
                    {row.status}
                  </Badge>
                ),
              },
              {
                key: "members",
                label: "Members",
                render: (row) => row._count.memberships,
              },
              {
                key: "clients",
                label: "Clients",
                render: (row) => row._count.clients,
              },
              {
                key: "created",
                label: "Created",
                render: (row) => new Date(row.createdAt).toLocaleDateString(),
              },
              {
                key: "actions",
                label: "Actions",
                render: (row) => (
                  <div className={styles.row}>
                    <SettingsButton
                      small
                      onClick={() => choose(row, "impersonate")}
                    >
                      Impersonate
                    </SettingsButton>
                    <SettingsButton
                      danger
                      small
                      disabled={row.id === identity.tenant.id}
                      onClick={() => choose(row, "delete")}
                    >
                      Delete
                    </SettingsButton>
                  </div>
                ),
              },
            ]}
          />
        </StatusPanel>
      </SettingsCard>
      {action.error && (
        <SettingsNotice title="Tenant action failed" error>
          {action.error}
        </SettingsNotice>
      )}
      {action.message && <SettingsNotice title={action.message} />}
      <CreateTenant
        open={create}
        onClose={() => setCreate(false)}
        refresh={query.reload}
      />
      <SettingsDialog
        open={!!selected && mode === "delete"}
        onClose={() => setSelected(undefined)}
        title="Permanently delete tenant"
        description="This permanently deletes the tenant and its associated records. It cannot be undone."
        footer={
          <>
            <SettingsButton
              disabled={action.busy}
              onClick={() => setSelected(undefined)}
            >
              Cancel
            </SettingsButton>
            <SettingsButton
              danger
              disabled={
                action.busy ||
                confirmation !== "DELETE" ||
                selected?.id === identity.tenant.id
              }
              onClick={() => {
                if (selected && confirmation === "DELETE")
                  void action.run(
                    () =>
                      api.request("settings.hq.tenants.delete", {
                        params: { tenantId: selected.id },
                      }),
                    "Tenant was deleted.",
                    () => {
                      setSelected(undefined);
                      query.reload();
                    },
                  );
              }}
            >
              Delete tenant
            </SettingsButton>
          </>
        }
      >
        <p>
          You are about to permanently delete: <strong>{selected?.name}</strong>{" "}
          · {selected?.slug}
        </p>
        <SettingField label="Type DELETE to confirm">
          <TextInput
            autoComplete="off"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
          />
        </SettingField>
        {action.error && (
          <SettingsNotice title="Deletion failed" error>
            {action.error}
          </SettingsNotice>
        )}
      </SettingsDialog>
      <SettingsDialog
        open={!!selected && mode === "impersonate"}
        onClose={() => setSelected(undefined)}
        title={`Impersonate ${selected?.slug ?? "tenant"}`}
        description="The reason is recorded in the audit log alongside your user ID."
        footer={
          <>
            <SettingsButton onClick={() => setSelected(undefined)}>
              Cancel
            </SettingsButton>
            <SettingsButton primary disabled>
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
            disabled
          />
        </SettingField>
        <SettingsNotice title="Impersonation unavailable">
          The new frontend does not yet bind an audited impersonation scope to
          subsequent requests. Starting a session is unavailable until that
          trusted connection is implemented.
        </SettingsNotice>
      </SettingsDialog>
      {selected && mode === "detail" && (
        <TenantDetails
          tenantId={selected.id}
          onClose={() => setSelected(undefined)}
        />
      )}
    </div>
  );
}
