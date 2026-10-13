"use client";

import { useState } from "react";
import { useCapiro } from "../../../shared/capiro/CapiroBoundary";
import type { OperationResponse } from "../../../shared/capiro/contracts";
import type { analystOperations } from "../../../shared/capiro/operations/settings-admin/analyst";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  Badge,
  DataTable,
  StatusPanel,
  TextArea,
} from "../../../shared/module-ui";
import {
  SettingFacts,
  SettingField,
  SettingsButton,
  SettingsCard,
  SettingsDialog,
  SettingsNotice,
} from "../components";
import styles from "../styles";
import { useSettingsAction } from "../useSettingsAction";
import { QueuePagination } from "./QueuePagination";

type MergeItem = OperationResponse<
  (typeof analystOperations)["settings.analyst.personnelMerge.list"]
>["data"][number];
type Person = MergeItem["primaryPerson"];
const decisions = [
  ["merge", "Merge"],
  ["keep_separate", "Keep separate"],
  ["reject_a", "Mark A wrong"],
  ["reject_b", "Mark B wrong"],
] as const;

export function PersonCandidateQueue() {
  const api = useCapiro();
  const [page, setPage] = useState(1);
  const query = useCapiroQuery("settings.analyst.personCandidates.list", {
    query: { status: "candidate", page, limit: 25 },
  });
  const action = useSettingsAction();
  return (
    <div className={styles.stack} data-design-target="411:78250">
      <SettingsCard
        title="Contact review queue"
        description="Restricted lines never reach this queue. Where a program office is withheld from the public directory, Capiro records the restriction on the profile rather than sourcing the contact."
      >
        <StatusPanel
          loading={query.loading}
          error={query.error}
          onRetry={query.reload}
        >
          <DataTable
            rows={query.data?.data ?? []}
            rowKey={(row) => row.id}
            caption="Acquisition personnel program candidates"
            columns={[
              {
                key: "person",
                label: "Person",
                render: (row) => (
                  <div>
                    {row.person?.fullName ?? "Person unavailable"}
                    <p className={styles.description}>
                      {[row.person?.organization, row.person?.title]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                ),
              },
              {
                key: "pe",
                label: "Proposed PE",
                render: (row) => (
                  <div>
                    {row.peCode}
                    <p className={styles.description}>
                      {row.programElement?.title}
                    </p>
                  </div>
                ),
              },
              { key: "score", label: "Score", render: (row) => row.score },
              {
                key: "why",
                label: "Why it matched",
                render: (row) => row.matchBasis,
              },
              {
                key: "actions",
                label: "Actions",
                render: (row) => (
                  <div className={styles.row}>
                    <SettingsButton
                      primary
                      small
                      disabled={action.busy}
                      onClick={() =>
                        void action.run(
                          () =>
                            api.request(
                              "settings.analyst.personCandidates.decide",
                              {
                                params: { id: row.id },
                                body: { decision: "confirm" },
                              },
                            ),
                          (result) =>
                            result.linked
                              ? "Personnel link was confirmed."
                              : "Personnel review was recorded.",
                          query.reload,
                        )
                      }
                    >
                      Confirm
                    </SettingsButton>
                    <SettingsButton
                      danger
                      small
                      disabled={action.busy}
                      onClick={() =>
                        void action.run(
                          () =>
                            api.request(
                              "settings.analyst.personCandidates.decide",
                              {
                                params: { id: row.id },
                                body: { decision: "reject" },
                              },
                            ),
                          "Personnel candidate was rejected.",
                          query.reload,
                        )
                      }
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
      {action.error && (
        <SettingsNotice title="Personnel review failed" error>
          {action.error}
        </SettingsNotice>
      )}
      {action.message && <SettingsNotice title={action.message} />}
    </div>
  );
}

function PersonRecord({ person, title }: { person: Person; title: string }) {
  return (
    <SettingsCard
      title={`${title} · ${person?.fullName ?? "Record unavailable"}`}
    >
      {person ? (
        <>
          <SettingFacts
            items={[
              ["Organization", person.organization],
              ["Title", person.title],
              ["Role", person.role],
              ["Service", person.service],
              ["Status", person.status],
              ["Confidence", `${Math.round(person.confidence * 100)}%`],
            ]}
          />
          <h3>Sources</h3>
          <div className={styles.row}>
            {person.sources?.length ? (
              person.sources.map((source, index) => (
                <Badge key={`${source.source}:${index}`}>{source.source}</Badge>
              ))
            ) : (
              <p className={styles.description}>No source details returned.</p>
            )}
          </div>
        </>
      ) : (
        <p className={styles.description}>
          This personnel record is unavailable.
        </p>
      )}
    </SettingsCard>
  );
}

export function PersonnelMergeQueue() {
  const api = useCapiro();
  const [page, setPage] = useState(1);
  const query = useCapiroQuery("settings.analyst.personnelMerge.list", {
    query: { status: "open", page, limit: 10 },
  });
  const [review, setReview] = useState<{
    item: MergeItem;
    decision: (typeof decisions)[number][0];
  }>();
  const [notes, setNotes] = useState("");
  const action = useSettingsAction();
  return (
    <div className={styles.stack} data-design-target="411:76239">
      <SettingsCard
        title="Personnel Merge Queue"
        action={
          <SettingsButton small onClick={query.reload}>
            Refresh
          </SettingsButton>
        }
        description="Near-duplicate acquisition personnel flagged by the writer. Review each side-by-side and decide whether to merge or keep separate."
      >
        <StatusPanel
          loading={query.loading}
          error={query.error}
          onRetry={query.reload}
        >
          {query.data?.data.length ? (
            query.data.data.map((item) => (
              <div key={item.id} className={styles.stack}>
                <div className={styles.row}>
                  <Badge>
                    Similarity {Math.round(item.similarityScore * 100)}%
                  </Badge>
                  <p className={styles.description}>
                    Queued {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className={`${styles.grid} ${styles.two}`}>
                  <PersonRecord
                    title="Record A (primary)"
                    person={item.primaryPerson}
                  />
                  <PersonRecord
                    title="Record B (secondary)"
                    person={item.secondaryPerson}
                  />
                </div>
                <div className={styles.row}>
                  {decisions.map(([decision, label]) => (
                    <SettingsButton
                      key={decision}
                      primary={decision === "merge"}
                      danger={decision.startsWith("reject")}
                      disabled={action.busy}
                      onClick={() => {
                        setReview({ item, decision });
                        setNotes("");
                        action.clear();
                      }}
                    >
                      {label}
                    </SettingsButton>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <p className={styles.empty}>No personnel merge candidates.</p>
          )}
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
      {action.error && (
        <SettingsNotice title="Personnel merge review failed" error>
          {action.error}
        </SettingsNotice>
      )}
      {action.message && <SettingsNotice title={action.message} />}
      <SettingsDialog
        open={!!review}
        onClose={() => setReview(undefined)}
        title={`${decisions.find(([id]) => id === review?.decision)?.[1] ?? "Review"} personnel records?`}
        description="Your review decision will be recorded in the audit log."
        footer={
          <>
            <SettingsButton
              onClick={() => setReview(undefined)}
              disabled={action.busy}
            >
              Cancel
            </SettingsButton>
            <SettingsButton
              primary
              disabled={action.busy}
              onClick={() => {
                if (review)
                  void action.run(
                    () =>
                      api.request("settings.analyst.personnelMerge.decide", {
                        params: { id: review.item.id },
                        body: {
                          decision: review.decision,
                          ...(notes ? { notes } : {}),
                        },
                      }),
                    "Personnel review decision was recorded.",
                    () => {
                      setReview(undefined);
                      query.reload();
                    },
                  );
              }}
            >
              Confirm review
            </SettingsButton>
          </>
        }
      >
        <p>
          {review?.item.primaryPerson?.fullName} ·{" "}
          {review?.item.secondaryPerson?.fullName}
        </p>
        <SettingField label="Notes (optional)">
          <TextArea
            maxLength={10000}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </SettingField>
        {action.error && (
          <SettingsNotice title="Review could not be saved" error>
            {action.error}
          </SettingsNotice>
        )}
      </SettingsDialog>
    </div>
  );
}
