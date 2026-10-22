"use client";

import { useState } from "react";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  Badge,
  DataTable,
  StatusPanel,
  TextInput,
} from "../../../shared/module-ui";
import {
  SettingsButton,
  SettingsCard,
  SettingsDialog,
  SettingsNotice,
} from "../components";
import styles from "../styles";
import { useSettingsMutation } from "../useSettingsMutation";
import { SettingsMutationNotice } from "../SettingsMutationNotice";
import { QueuePagination } from "./QueuePagination";

export function ProgramMatchQueue() {
  const { api, action, pending, reconcile, locked } = useSettingsMutation(
    "analyst-program-matches",
  );
  const [status, setStatus] = useState("candidate");
  const [page, setPage] = useState(1);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [evidence, setEvidence] = useState<unknown>();
  const query = useCapiroQuery("settings.analyst.programMatches.list", {
    query: { status, page, limit: 25 },
  });
  const decide = (id: string, decision: "accept" | "quarantine" | "reject") =>
    action.run(
      (signal) =>
        api.request(
          "settings.analyst.programMatches.decide",
          {
            params: { id },
            body: { decision, ...(notes[id] ? { notes: notes[id] } : {}) },
          },
          { signal },
        ),
      "Program match review was recorded.",
      query.reload,
    );
  return (
    <div className={styles.stack} data-design-target="411:77538">
      <SettingsCard
        title="Program Match Review Queue"
        description="Machine-proposed PE→Program links awaiting review. Nothing is applied automatically; every decision is audit-logged."
        action={
          <select
            disabled={locked}
            className={styles.input}
            aria-label="Program match status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="candidate">Candidates</option>
            <option value="quarantined">Quarantined</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
        }
      >
        <StatusPanel
          loading={query.loading}
          error={query.error}
          onRetry={query.reload}
        >
          <DataTable
            rows={query.data?.data ?? []}
            rowKey={(row) => row.id}
            caption="Program match review queue"
            columns={[
              {
                key: "program",
                label: "Program",
                render: (row) => (
                  <div>
                    {row.program?.canonicalName ?? "Unknown program"}
                    <p className={styles.description}>
                      {[row.program?.mdapCode, row.program?.component]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                ),
              },
              {
                key: "pe",
                label: "Program element",
                render: (row) => (
                  <div>
                    {row.peCode}
                    <p className={styles.description}>
                      {row.programElement?.title}
                    </p>
                  </div>
                ),
              },
              {
                key: "confidence",
                label: "Confidence",
                render: (row) => (
                  <div>
                    <Badge
                      tone={
                        row.confidenceBand === "high" ? "success" : "warning"
                      }
                    >
                      {row.confidenceBand}
                    </Badge>
                    <p className={styles.description}>
                      {row.score} · {row.evidenceTier}
                    </p>
                  </div>
                ),
              },
              { key: "why", label: "Why shown", render: (row) => row.whyShown },
              {
                key: "evidence",
                label: "Evidence",
                render: (row) => (
                  <SettingsButton
                    disabled={locked}
                    small
                    onClick={() => setEvidence(row.evidence)}
                  >
                    View evidence
                  </SettingsButton>
                ),
              },
              {
                key: "status",
                label: "Status",
                render: (row) => <Badge>{row.status}</Badge>,
              },
              {
                key: "notes",
                label: "Notes",
                render: (row) => (
                  <TextInput
                    disabled={locked}
                    aria-label={`Notes for ${row.peCode} ${row.program?.canonicalName ?? row.id}`}
                    maxLength={10000}
                    value={notes[row.id] ?? ""}
                    placeholder="Optional"
                    onChange={(event) =>
                      setNotes((current) => ({
                        ...current,
                        [row.id]: event.target.value,
                      }))
                    }
                  />
                ),
              },
              {
                key: "actions",
                label: "Actions",
                render: (row) => (
                  <div className={styles.row}>
                    <SettingsButton
                      primary
                      small
                      disabled={locked}
                      onClick={() => void decide(row.id, "accept")}
                    >
                      Accept
                    </SettingsButton>
                    <SettingsButton
                      small
                      disabled={locked}
                      onClick={() => void decide(row.id, "quarantine")}
                    >
                      Quarantine
                    </SettingsButton>
                    <SettingsButton
                      danger
                      small
                      disabled={locked}
                      onClick={() => void decide(row.id, "reject")}
                    >
                      Reject
                    </SettingsButton>
                  </div>
                ),
              },
            ]}
          />
          {query.data && (
            <QueuePagination
              page={query.data.page}
              total={query.data.total}
              limit={query.data.limit}
              onChange={setPage}
            />
          )}
        </StatusPanel>
      </SettingsCard>
      <SettingsMutationNotice
        pending={pending}
        busy={action.busy}
        reconcile={reconcile}
      />
      {action.error && (
        <SettingsNotice title="Program match action failed" error>
          {action.error}
        </SettingsNotice>
      )}
      {action.message && <SettingsNotice title={action.message} />}
      <SettingsDialog
        busy={action.busy}
        open={evidence !== undefined}
        onClose={() => setEvidence(undefined)}
        title="Program match evidence"
      >
        <pre className={styles.pre}>{JSON.stringify(evidence, null, 2)}</pre>
      </SettingsDialog>
    </div>
  );
}
