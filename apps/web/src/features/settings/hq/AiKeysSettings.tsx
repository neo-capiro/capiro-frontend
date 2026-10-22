"use client";

import { useMemo, useState } from "react";
import type { z } from "zod";
import type { maskedCredentialSchema } from "../../../shared/capiro/operations/settings-schemas";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  Badge,
  DataTable,
  StatusPanel,
  TextInput,
} from "../../../shared/module-ui";
import {
  SettingField,
  SettingsButton,
  SettingsCard,
  SettingsDialog,
  SettingsNotice,
  SettingsTabs,
} from "../components";
import styles from "../styles";
import { useSettingsMutation } from "../useSettingsMutation";
import { SettingsMutationNotice } from "../SettingsMutationNotice";

const money = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    value,
  );
const number = (value: number) =>
  new Intl.NumberFormat("en-US", { notation: "compact" }).format(value);
type Credential = z.infer<typeof maskedCredentialSchema>;

export function AiKeysSettings() {
  const [days, setDays] = useState("30");
  const [now] = useState(() => Date.now());
  const range = useMemo(
    () => ({
      from: new Date(now - Number(days) * 86400000).toISOString(),
      to: new Date(now).toISOString(),
    }),
    [days, now],
  );
  const query = useCapiroQuery("settings.hq.ai.usage", { query: range });
  const [selected, setSelected] = useState<{ id: string; name: string }>();
  return (
    <div className={styles.stack} data-design-target="411:75937">
      <div className={styles.row}>
        <p className={`${styles.description} ${styles.grow}`}>
          Estimated AI spend per tenant. Open a tenant to manage its own
          provider key.
        </p>
        <SettingsTabs
          label="Tenant AI usage period"
          value={days}
          onChange={setDays}
          items={["7", "30", "90"].map((id) => ({ id, label: `${id} days` }))}
        />
      </div>
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        <div className={styles.card}>
          <DataTable
            rows={query.data ?? []}
            rowKey={(row) => row.tenantId}
            caption="AI usage by tenant"
            columns={[
              {
                key: "tenant",
                label: "Tenant",
                render: (row) => row.tenantName,
              },
              {
                key: "spend",
                label: "Est. spend",
                render: (row) => money(row.totalCostUsd),
              },
              {
                key: "tokens",
                label: "Tokens",
                render: (row) => number(row.totalTokens),
              },
              {
                key: "generations",
                label: "Generations",
                render: (row) => row.eventCount,
              },
              {
                key: "key",
                label: "Key",
                render: (row) => (
                  <Badge tone={row.tenantKeyEventCount ? "success" : "neutral"}>
                    {row.tenantKeyEventCount ? "Own key used" : "Capiro shared"}
                  </Badge>
                ),
              },
              {
                key: "actions",
                label: "Actions",
                render: (row) => (
                  <SettingsButton
                    small
                    onClick={() =>
                      setSelected({ id: row.tenantId, name: row.tenantName })
                    }
                  >
                    Manage
                  </SettingsButton>
                ),
              },
            ]}
          />
        </div>
      </StatusPanel>
      {selected && (
        <TenantKeyDrawer
          tenant={selected}
          range={range}
          onClose={() => setSelected(undefined)}
          refresh={query.reload}
        />
      )}
    </div>
  );
}

function TenantKeyDrawer({
  tenant,
  range,
  onClose,
  refresh,
}: {
  tenant: { id: string; name: string };
  range: { from: string; to: string };
  onClose: () => void;
  refresh: () => void;
}) {
  const { api, action, pending, reconcile, locked } = useSettingsMutation(
    `hq-keys:${tenant.id}`,
  );
  const credentials = useCapiroQuery("settings.hq.ai.credentials", {
    params: { tenantId: tenant.id },
  });
  const usage = useCapiroQuery("settings.hq.ai.tenantUsage", {
    params: { tenantId: tenant.id },
    query: range,
  });
  const [provider, setProvider] = useState<"openai" | "anthropic">("openai");
  const [key, setKey] = useState("");
  const [model, setModel] = useState("");
  const [remove, setRemove] = useState<Credential>();
  const reload = () => {
    credentials.reload();
    usage.reload();
    refresh();
  };
  return (
    <SettingsDialog
      busy={action.busy}
      open
      side="right"
      onClose={() => {
        setKey("");
        onClose();
      }}
      title={`${tenant.name}, AI usage & key`}
    >
      <SettingsCard title="Provider key">
        <StatusPanel
          loading={credentials.loading}
          error={credentials.error}
          onRetry={credentials.reload}
        >
          {(credentials.data ?? []).map((credential) => (
            <div className={styles.row} key={credential.provider}>
              <div className={styles.grow}>
                <Badge>{credential.provider}</Badge> •••• {credential.last4}{" "}
                <Badge>{credential.modelOverride ?? "Default model"}</Badge>{" "}
                <Badge
                  tone={credential.status === "active" ? "success" : "warning"}
                >
                  {credential.status}
                </Badge>
              </div>
              <SettingsButton
                danger
                small
                disabled={
                  locked ||
                  !["openai", "anthropic"].includes(credential.provider)
                }
                onClick={() => setRemove(credential)}
              >
                Remove
              </SettingsButton>
              {credential.provider === "openai" && credential.updatedAt && (
                <SettingsButton
                  small
                  disabled={locked}
                  onClick={() =>
                    void action.run(
                      (signal) =>
                        api.request(
                          "settings.hq.ai.updateModel",
                          {
                            params: { tenantId: tenant.id },
                            body: {
                              provider: "openai",
                              ...(credential.modelOverride === "gpt-6.1-sol"
                                ? { restoreDefault: true }
                                : { modelOverride: "gpt-6.1-sol" }),
                              expectedModelOverride: credential.modelOverride,
                              expectedUpdatedAt: credential.updatedAt!,
                            },
                          },
                          { signal },
                        ),
                      "Provider model was updated.",
                      reload,
                    )
                  }
                >
                  {credential.modelOverride === "gpt-6.1-sol"
                    ? "Restore default"
                    : "Use GPT-6.1 Sol"}
                </SettingsButton>
              )}
            </div>
          ))}
        </StatusPanel>
        <form
          className={styles.stack}
          onSubmit={(event) => {
            event.preventDefault();
            void action.run(
              (signal) =>
                api.request(
                  "settings.hq.ai.setCredential",
                  {
                    params: { tenantId: tenant.id },
                    body: {
                      provider,
                      apiKey: key,
                      ...(model ? { modelOverride: model } : {}),
                    },
                  },
                  { signal },
                ),
              "Provider key was validated and saved.",
              () => {
                setKey("");
                reload();
              },
            );
          }}
        >
          <div className={`${styles.grid} ${styles.two}`}>
            <SettingField label="Provider">
              <select
                disabled={locked}
                className={styles.input}
                value={provider}
                onChange={(event) =>
                  setProvider(event.target.value as typeof provider)
                }
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
              </select>
            </SettingField>
            <SettingField label="API key">
              <TextInput
                disabled={locked}
                type="password"
                autoComplete="off"
                required
                minLength={8}
                maxLength={400}
                value={key}
                placeholder="Paste API key (write-only)"
                onChange={(event) => setKey(event.target.value)}
              />
            </SettingField>
          </div>
          <SettingField label="Model override">
            <TextInput
              disabled={locked}
              maxLength={80}
              value={model}
              placeholder="Default model"
              onChange={(event) => setModel(event.target.value)}
            />
          </SettingField>
          <p className={styles.description}>
            Leave blank to use the platform default for this provider.
          </p>
          <div>
            <SettingsButton primary type="submit" disabled={locked}>
              {action.busy ? "Validating…" : "Validate & save"}
            </SettingsButton>
          </div>
        </form>
        <SettingsMutationNotice
          pending={pending}
          busy={action.busy}
          reconcile={reconcile}
        />
        {action.error && (
          <SettingsNotice title="Provider key action failed" error>
            {action.error}
          </SettingsNotice>
        )}
        {action.message && <SettingsNotice title={action.message} />}
      </SettingsCard>
      <StatusPanel
        loading={usage.loading}
        error={usage.error}
        onRetry={usage.reload}
      >
        {usage.data && (
          <>
            <div className={styles.grid}>
              <div className={styles.metric}>
                <span>Estimated spend</span>
                <strong>{money(usage.data.totalCostUsd)}</strong>
              </div>
              <div className={styles.metric}>
                <span>Tokens</span>
                <strong>
                  {number(
                    usage.data.totalInputTokens + usage.data.totalOutputTokens,
                  )}
                </strong>
              </div>
              <div className={styles.metric}>
                <span>Generations</span>
                <strong>{usage.data.eventCount}</strong>
                <p className={styles.description}>
                  {usage.data.tenantKeyEventCount} billed to your own key
                </p>
              </div>
            </div>
            <SettingsCard title="By workflow">
              <DataTable
                rows={usage.data.byWorkflow}
                rowKey={(row) => row.workflow}
                caption="Tenant usage by workflow"
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
                    render: (row) => number(row.inputTokens + row.outputTokens),
                  },
                  { key: "runs", label: "Runs", render: (row) => row.count },
                ]}
              />
            </SettingsCard>
          </>
        )}
      </StatusPanel>
      <SettingsDialog
        busy={action.busy}
        open={!!remove}
        onClose={() => setRemove(undefined)}
        title="Remove provider key?"
        description="Future generations will use the configured shared provider key."
        footer={
          <>
            <SettingsButton
              disabled={locked}
              onClick={() => setRemove(undefined)}
            >
              Cancel
            </SettingsButton>
            <SettingsButton
              danger
              disabled={locked}
              onClick={() => {
                if (remove && ["openai", "anthropic"].includes(remove.provider))
                  void action.run(
                    (signal) =>
                      api.request(
                        "settings.hq.ai.removeCredential",
                        {
                          params: {
                            tenantId: tenant.id,
                            provider: remove.provider as "openai" | "anthropic",
                          },
                        },
                        { signal },
                      ),
                    "Provider key was removed.",
                    () => {
                      setRemove(undefined);
                      reload();
                    },
                  );
              }}
            >
              Remove key
            </SettingsButton>
          </>
        }
      >
        <p>
          {remove?.provider} · •••• {remove?.last4}
        </p>
        <SettingsMutationNotice
          pending={pending}
          busy={action.busy}
          reconcile={reconcile}
        />
        {action.error && (
          <SettingsNotice title="Key removal failed" error>
            {action.error}
          </SettingsNotice>
        )}
      </SettingsDialog>
    </SettingsDialog>
  );
}
