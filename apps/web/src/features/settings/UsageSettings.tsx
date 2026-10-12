"use client";

import { useMemo, useState } from "react";
import { useCapiroQuery } from "../../shared/capiro/queries";
import { DataTable, StatusPanel } from "../../shared/module-ui";
import { SettingsCard, SettingsTabs } from "./components";
import styles from "./styles";

const money = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    value,
  );
const number = (value: number) =>
  new Intl.NumberFormat("en-US", { notation: "compact" }).format(value);

export function UsageSettings() {
  const [days, setDays] = useState("30");
  const range = useMemo(
    () => ({
      from: new Date(Date.now() - Number(days) * 86400000).toISOString(),
      to: new Date().toISOString(),
    }),
    [days],
  );
  const query = useCapiroQuery("settings.aiUsage.summary", { query: range });
  const credentials = useCapiroQuery("settings.aiUsage.credentials", {});
  const usage = query.data;
  const series = usage?.byDay ?? [];
  const maxCost = Math.max(1, ...series.map((item) => item.costUsd));
  const points = series
    .map(
      (item, index) =>
        `${series.length > 1 ? (1000 * index) / (series.length - 1) : 500},${180 - (160 * item.costUsd) / maxCost}`,
    )
    .join(" ");
  return (
    <div className={styles.stack} data-design-target="411:71894">
      <div className={styles.row}>
        <p className={`${styles.description} ${styles.grow}`}>
          Estimated spend from AI features across your team.
        </p>
        <SettingsTabs
          label="Usage period"
          items={["7", "30", "90"].map((id) => ({ id, label: `${id} days` }))}
          value={days}
          onChange={setDays}
        />
      </div>
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        {usage && (
          <>
            <div className={styles.grid}>
              <div className={styles.metric}>
                <span>Estimated spend</span>
                <strong>{money(usage.totalCostUsd)}</strong>
              </div>
              <div className={styles.metric}>
                <span>Tokens</span>
                <strong>
                  {number(usage.totalInputTokens + usage.totalOutputTokens)}
                </strong>
                <p className={styles.description}>
                  {number(usage.totalInputTokens)} in ·{" "}
                  {number(usage.totalOutputTokens)} out
                </p>
              </div>
              <div className={styles.metric}>
                <span>Generations</span>
                <strong>{usage.eventCount.toLocaleString()}</strong>
                <p className={styles.description}>
                  {usage.tenantKeyEventCount} billed to your own key
                </p>
              </div>
            </div>
            <SettingsCard title="Estimated cost by day">
              {series.length ? (
                <svg
                  viewBox="0 0 1000 200"
                  role="img"
                  aria-label={`Estimated daily cost in US dollars, maximum ${money(maxCost)}`}
                  style={{ width: "100%", height: 200 }}
                >
                  <title>Estimated AI cost by day</title>
                  {[20, 60, 100, 140, 180].map((y) => (
                    <line
                      key={y}
                      x1={0}
                      x2={1000}
                      y1={y}
                      y2={y}
                      stroke="#a8a29e"
                      strokeWidth={1}
                    />
                  ))}
                  <polyline
                    points={points}
                    fill="none"
                    stroke="#0a0a0a"
                    strokeWidth={2}
                  />
                </svg>
              ) : (
                <p className={styles.empty}>No usage for this period.</p>
              )}
              <details>
                <summary>View daily values</summary>
                <DataTable
                  rows={series}
                  rowKey={(row) => row.day}
                  caption="Daily AI cost"
                  columns={[
                    { key: "date", label: "Day", render: (row) => row.day },
                    {
                      key: "cost",
                      label: "Cost",
                      render: (row) => money(row.costUsd),
                    },
                    {
                      key: "runs",
                      label: "Generations",
                      render: (row) => row.count,
                    },
                  ]}
                />
              </details>
            </SettingsCard>
            <div className={`${styles.grid} ${styles.two}`}>
              <SettingsCard title="By workflow">
                <DataTable
                  rows={usage.byWorkflow}
                  rowKey={(row) => row.workflow}
                  caption="AI spend by workflow"
                  columns={[
                    {
                      key: "workflow",
                      label: "Workflow",
                      render: (row) => row.workflow,
                    },
                    {
                      key: "cost",
                      label: "Est. cost",
                      render: (row) => money(row.costUsd),
                    },
                    {
                      key: "tokens",
                      label: "Tokens",
                      render: (row) =>
                        number(row.inputTokens + row.outputTokens),
                    },
                    { key: "runs", label: "Runs", render: (row) => row.count },
                  ]}
                />
              </SettingsCard>
              <SettingsCard title="By model">
                <DataTable
                  rows={usage.byModel}
                  rowKey={(row) => row.model}
                  caption="AI spend by model"
                  columns={[
                    {
                      key: "model",
                      label: "Model",
                      render: (row) => row.model,
                    },
                    {
                      key: "cost",
                      label: "Est. cost",
                      render: (row) => money(row.costUsd),
                    },
                    {
                      key: "tokens",
                      label: "Tokens",
                      render: (row) =>
                        number(row.inputTokens + row.outputTokens),
                    },
                    { key: "runs", label: "Runs", render: (row) => row.count },
                  ]}
                />
              </SettingsCard>
            </div>
          </>
        )}
      </StatusPanel>
      <SettingsCard
        title="AI provider key"
        description="Generations run on the Capiro shared key. If you would like usage billed to your firm’s own provider key, contact your account manager. Capiro configures it for you; stored encrypted, never displayed."
      >
        <StatusPanel
          loading={credentials.loading}
          error={credentials.error}
          onRetry={credentials.reload}
        >
          <DataTable
            rows={credentials.data ?? []}
            rowKey={(row) => row.provider}
            caption="Configured AI providers"
            emptyMessage="No firm provider keys configured."
            columns={[
              {
                key: "provider",
                label: "Provider",
                render: (row) => row.provider,
              },
              {
                key: "masked",
                label: "Key",
                render: (row) => `••••${row.last4}`,
              },
              { key: "status", label: "Status", render: (row) => row.status },
              {
                key: "model",
                label: "Model",
                render: (row) => row.modelOverride ?? "Default",
              },
            ]}
          />
        </StatusPanel>
      </SettingsCard>
    </div>
  );
}
