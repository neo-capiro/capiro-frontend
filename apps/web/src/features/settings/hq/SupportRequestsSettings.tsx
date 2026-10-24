"use client";

import { useState } from "react";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import { DataTable, StatusPanel } from "../../../shared/module-ui";
import {
  SettingsButton,
  SettingsCard,
  SettingsDialog,
  SettingsNotice,
} from "../components";
import styles from "../styles";

function SupportRequestDetail({
  tenantId,
  id,
  onClose,
}: {
  tenantId: string;
  id: string;
  onClose: () => void;
}) {
  const query = useCapiroQuery("settings.hq.support.detail", {
    params: { id },
    query: { tenantId },
  });
  return (
    <SettingsDialog
      open
      title="Support request"
      onClose={onClose}
      footer={<SettingsButton onClick={onClose}>Close</SettingsButton>}
    >
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        {query.data && (
          <>
            <h3>{query.data.summary}</h3>
            <p className={styles.description}>
              Saved {new Date(query.data.createdAt).toLocaleString()} · Request{" "}
              {query.data.id}
            </p>
            <p className={styles.description}>
              Submitted by member {query.data.submittedByUserId}
            </p>
            <p style={{ whiteSpace: "pre-wrap" }}>{query.data.detail}</p>
            {query.data.runReference && (
              <p style={{ whiteSpace: "pre-wrap" }}>
                User-provided run reference: {query.data.runReference}
              </p>
            )}
            <p className={styles.description}>
              Saved for HQ review. This record does not track resolution or send
              a reply.
            </p>
          </>
        )}
      </StatusPanel>
    </SettingsDialog>
  );
}
function TenantSupportRequests({ tenantId }: { tenantId: string }) {
  const [cursor, setCursor] = useState<string>();
  const [selected, setSelected] = useState<string>();
  const query = useCapiroQuery("settings.hq.support.list", {
    query: { tenantId, ...(cursor ? { cursor } : {}) },
  });
  return (
    <SettingsCard
      title="Support requests"
      action={<SettingsButton onClick={query.reload}>Refresh</SettingsButton>}
    >
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        {query.data && (
          <>
            <DataTable
              caption="Saved support requests"
              rows={query.data.items}
              rowKey={(row) => row.id}
              columns={[
                {
                  key: "summary",
                  label: "Summary",
                  render: (row) => (
                    <SettingsButton small onClick={() => setSelected(row.id)}>
                      {row.summary}
                    </SettingsButton>
                  ),
                },
                {
                  key: "date",
                  label: "Saved",
                  render: (row) => new Date(row.createdAt).toLocaleString(),
                },
              ]}
            />
            {query.data.items.length === 0 && <p>No support requests found.</p>}
            <div className={styles.row}>
              {cursor && (
                <SettingsButton onClick={() => setCursor(undefined)}>
                  Newest requests
                </SettingsButton>
              )}
              {query.data.nextCursor && (
                <SettingsButton
                  onClick={() => setCursor(query.data!.nextCursor!)}
                >
                  Older requests
                </SettingsButton>
              )}
            </div>
          </>
        )}
      </StatusPanel>
      {selected && (
        <SupportRequestDetail
          key={selected}
          id={selected}
          tenantId={tenantId}
          onClose={() => setSelected(undefined)}
        />
      )}
    </SettingsCard>
  );
}
export function SupportRequestsSettings() {
  const tenants = useCapiroQuery("settings.hq.tenants.list", {});
  const [tenantId, setTenantId] = useState("");
  return (
    <div className={styles.stack}>
      <SettingsCard title="Tenant">
        <StatusPanel
          loading={tenants.loading}
          error={tenants.error}
          onRetry={tenants.reload}
        >
          <select
            className={styles.input}
            aria-label="Support request tenant"
            value={tenantId}
            onChange={(event) => setTenantId(event.target.value)}
          >
            <option value="">Pick a tenant</option>
            {(tenants.data ?? []).map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name} · {tenant.slug}
              </option>
            ))}
          </select>
        </StatusPanel>
      </SettingsCard>
      {tenantId ? (
        <TenantSupportRequests key={tenantId} tenantId={tenantId} />
      ) : (
        <SettingsNotice title="Pick a tenant">
          Choose the tenant whose saved reports you want to review.
        </SettingsNotice>
      )}
    </div>
  );
}
