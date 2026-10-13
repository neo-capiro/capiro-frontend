"use client";
import { useState } from "react";
import type { z } from "zod";
import type { digestRun } from "../../../../../shared/capiro/operations/legiwatch-analytics";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  Panel,
  StatusPanel,
} from "../../../../../shared/module-ui";
import { SelectField, downloadText } from "../components";
import styles from "../legiwatch.module.css";
export function DigestScreen() {
  const [clientId, setClient] = useState("");
  const clients = useCapiroQuery("clients.list", {});
  return (
    <div className={styles.form} data-figma-node="926:182798">
      <SelectField
        id="digest-client"
        label="Client"
        value={clientId}
        onChange={setClient}
      >
        <option value="">All clients</option>
        {clients.data?.map((client) => (
          <option key={client.id} value={client.id}>
            {client.name}
          </option>
        ))}
      </SelectField>
      <DigestScope key={clientId} clientId={clientId} />
    </div>
  );
}
function DigestScope({ clientId }: { clientId: string }) {
  const [selected, setSelected] = useState("");
  const scope = clientId ? { clientId } : {};
  const history = useCapiroQuery("legiwatch.digest.history", {
      query: { ...scope, limit: 100 },
    }),
    run = useCapiroQuery(
      "legiwatch.digest.run",
      { params: { id: selected || "unselected" } },
      { enabled: Boolean(selected) },
    ),
    generate = useCapiroMutation("legiwatch.digest.generate");
  const create = async () => {
    try {
      const result = await generate.run({ query: scope });
      setSelected(result.id);
      history.reload();
    } catch {
      /* Do not claim a digest was generated without its receipt. */
    }
  };
  return (
    <div className={styles.form}>
      <p className={styles.banner}>
        Legacy digest provides saved runs and manual generation. Automatic
        generation and email are inactive here; reviewed delivery is available
        in Reports.
      </p>
      <StatusPanel
        loading={history.loading}
        error={history.error}
        onRetry={history.reload}
      >
        <SelectField
          id="digest-run"
          label="Saved run"
          value={selected}
          onChange={setSelected}
        >
          <option value="">Choose a saved digest</option>
          {history.data?.rows.map((item) => (
            <option key={item.id} value={item.id}>
              {item.generatedAt} · {item.itemCount} items · {item.decisionCount}{" "}
              decisions
            </option>
          ))}
        </SelectField>
      </StatusPanel>
      <ActionButton
        primary
        disabled={generate.pending}
        onClick={() => void create()}
      >
        {generate.pending ? "Preparing digest…" : "Generate digest now"}
      </ActionButton>
      {generate.error && <p role="alert">{generate.error.message}</p>}
      <StatusPanel loading={run.loading} error={run.error} onRetry={run.reload}>
        {run.data && <DigestContent data={run.data} />}
      </StatusPanel>
    </div>
  );
}
function DigestContent({ data }: { data: z.infer<typeof digestRun> }) {
  return (
    <Panel
      title={data.headline}
      description={`${data.scopeLabel} · ${data.generatedAt}`}
    >
      <ActionButton
        onClick={() =>
          downloadText(
            [
              data.headline,
              `${data.scopeLabel} · ${data.generatedAt}`,
              "What changed",
              ...data.whatChanged.map(
                (item) => `${item.title} · ${item.band} · ${item.sourceLabel}`,
              ),
              "Decisions required",
              ...data.decisionsRequired.map(
                (item) => `${item.title}\n${item.recommendedAction}`,
              ),
              "Upcoming hearings",
              ...data.upcomingHearings.map(
                (item) =>
                  `${item.date} · ${item.title} · ${item.committeeName}`,
              ),
              "Bill movement",
              ...data.billMovement.map(
                (item) =>
                  `${item.display} · ${item.status ?? "Status unavailable"}`,
              ),
              "Client implications",
              ...data.clientImplications.map(
                (item) => `${item.clientName} · ${item.band}`,
              ),
              "Recommended actions",
              ...data.recommendedActions,
              `${data.provenance.officialRecordCount} official records · ${data.provenance.captureCount} captures · ${data.provenance.sourceFamilies.join(", ")}`,
            ].join("\n\n"),
            `digest-${data.id}.txt`,
            "text/plain;charset=utf-8",
          )
        }
      >
        Export digest text
      </ActionButton>
      <h3>What changed</h3>
      {data.whatChanged.map((item) => (
        <p key={item.id}>
          {item.title} · {item.band} · {item.sourceLabel}
          {item.clientName ? ` · ${item.clientName}` : ""}
        </p>
      ))}
      <h3>Decisions required</h3>
      {data.decisionsRequired.map((item) => (
        <p key={item.id}>
          {item.title}
          <br />
          {item.recommendedAction}
        </p>
      ))}
      <h3>Upcoming hearings</h3>
      {data.upcomingHearings.map((item) => (
        <p key={item.id}>
          {item.date} · {item.title} · {item.committeeName}
        </p>
      ))}
      <h3>Bill movement</h3>
      {data.billMovement.map((item) => (
        <p key={item.id}>
          {item.display} · {item.status ?? "Status unavailable"}
        </p>
      ))}
      <h3>Client implications</h3>
      {data.clientImplications.map((item) => (
        <p key={item.clientId}>
          {item.clientName} · {item.band}
        </p>
      ))}
      <h3>Recommended actions</h3>
      {data.recommendedActions.map((action, index) => (
        <p key={index}>{action}</p>
      ))}
      <p className={styles.description}>
        {data.provenance.officialRecordCount} official records ·{" "}
        {data.provenance.captureCount} captures ·{" "}
        {data.provenance.sourceFamilies.join(", ")}
      </p>
    </Panel>
  );
}
