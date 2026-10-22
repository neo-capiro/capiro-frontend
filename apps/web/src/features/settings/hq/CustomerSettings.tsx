"use client";

import { useState } from "react";
import type { z } from "zod";
import type { customerSchema } from "../../../shared/capiro/operations/settings-admin/schemas";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import { Badge, DataTable, StatusPanel } from "../../../shared/module-ui";
import {
  SettingsButton,
  SettingsCard,
  SettingsDialog,
  SettingsNotice,
} from "../components";
import styles from "../styles";
import { useSettingsMutation } from "../useSettingsMutation";
import { SettingsMutationNotice } from "../SettingsMutationNotice";

const money = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    value,
  );
type Customer = z.infer<typeof customerSchema>;

export function CustomerSettings() {
  const { api, action, pending, reconcile, locked } =
    useSettingsMutation("hq-customers");
  const query = useCapiroQuery("settings.hq.customers.list", {});
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<Customer>();
  const customers = query.data ?? [];
  const rows = customers.filter(
    (customer) => status === "all" || customer.status === status,
  );
  return (
    <div className={styles.stack} data-design-target="411:75615">
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        <div className={styles.grid}>
          <div className={styles.metric}>
            <span>Paying customers</span>
            <strong>
              {customers.filter((customer) => customer.mrrUsd > 0).length}
            </strong>
          </div>
          <div className={styles.metric}>
            <span>Monthly recurring revenue</span>
            <strong>
              {money(
                customers.reduce((sum, customer) => sum + customer.mrrUsd, 0),
              )}
            </strong>
          </div>
          <div className={styles.metric}>
            <span>Overage (this period)</span>
            <strong>
              {money(
                customers.reduce(
                  (sum, customer) => sum + customer.llmOverageUsd,
                  0,
                ),
              )}
            </strong>
          </div>
        </div>
        <SettingsCard title="Capiro-managed client imports">
          <SettingsNotice title="Managed import status unavailable">
            The tenant billing response does not include the managed-import
            queue. Import status and completion need a verified onboarding
            contract.
          </SettingsNotice>
        </SettingsCard>
        <SettingsCard
          title="Customers"
          action={
            <select
              disabled={locked}
              className={styles.input}
              aria-label="Customer billing status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="all">All statuses</option>
              {Array.from(
                new Set(customers.map((customer) => customer.status)),
              ).map((value) => (
                <option value={value} key={value}>
                  {value}
                </option>
              ))}
            </select>
          }
        >
          <DataTable
            rows={rows}
            rowKey={(row) => row.tenantId}
            caption="Capiro customer billing"
            columns={[
              {
                key: "tenant",
                label: "Tenant",
                render: (row) => (
                  <div>
                    {row.name}
                    <p className={styles.description}>{row.slug}</p>
                  </div>
                ),
              },
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
                key: "profiles",
                label: "Profiles",
                render: (row) => `${row.usedSlots} / ${row.slots}`,
              },
              { key: "mrr", label: "MRR", render: (row) => money(row.mrrUsd) },
              {
                key: "ai",
                label: "AI used",
                render: (row) => money(row.llmUsedUsd),
              },
              {
                key: "overage",
                label: "Overage",
                render: (row) => money(row.llmOverageUsd),
              },
              {
                key: "renews",
                label: "Renews",
                render: (row) =>
                  row.currentPeriodEnd
                    ? new Date(row.currentPeriodEnd).toLocaleDateString()
                    : "—",
              },
              {
                key: "actions",
                label: "Actions",
                render: (row) => (
                  <SettingsButton
                    small
                    disabled={locked}
                    onClick={() => {
                      setSelected(row);
                      action.clear();
                    }}
                  >
                    {row.status === "comped" ? "Un-comp" : "Comp"}
                  </SettingsButton>
                ),
              },
            ]}
          />
        </SettingsCard>
      </StatusPanel>
      <SettingsMutationNotice
        pending={pending}
        busy={action.busy}
        reconcile={reconcile}
      />
      {action.error && (
        <SettingsNotice title="Customer action failed" error>
          {action.error}
        </SettingsNotice>
      )}
      {action.message && <SettingsNotice title={action.message} />}
      <SettingsDialog
        busy={action.busy}
        open={!!selected}
        onClose={() => setSelected(undefined)}
        title={
          selected?.status === "comped"
            ? "Remove complimentary access?"
            : "Grant complimentary access?"
        }
        description="This changes the tenant’s billing posture."
        footer={
          <>
            <SettingsButton
              disabled={locked}
              onClick={() => setSelected(undefined)}
            >
              Cancel
            </SettingsButton>
            <SettingsButton
              primary
              disabled={locked}
              onClick={() => {
                if (selected)
                  void action.run(
                    (signal) =>
                      api.request(
                        "settings.hq.customers.comp",
                        {
                          params: { tenantId: selected.tenantId },
                          body: { comped: selected.status !== "comped" },
                        },
                        { signal },
                      ),
                    "Customer billing status was updated.",
                    () => {
                      setSelected(undefined);
                      query.reload();
                    },
                  );
              }}
            >
              Confirm
            </SettingsButton>
          </>
        }
      >
        <p>
          {selected?.name} · {selected?.slug}
        </p>
        <SettingsMutationNotice
          pending={pending}
          busy={action.busy}
          reconcile={reconcile}
        />
        {action.error && (
          <SettingsNotice title="Billing status change failed" error>
            {action.error}
          </SettingsNotice>
        )}
      </SettingsDialog>
    </div>
  );
}
