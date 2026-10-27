"use client";
import { useState } from "react";
import { ExplorerExports } from "./ExplorerExports";
import { useIntelligenceLocation } from "./intelligence-location";
import {
  explorerDatasetOperations,
  type ExplorerDataset,
  type ExplorerRecord,
} from "../../../shared/capiro/operations/intelligence-explorer";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  ActionButton,
  DataTable,
  Panel,
  StatusPanel,
  TextInput,
} from "../../../shared/module-ui";
import styles from "./intelligence.module.css";
import { SaveBillToLegiWatch } from "./SaveBillToLegiWatch";
const datasets: { id: ExplorerDataset; label: string }[] = [
  { id: "news", label: "News Feed" },
  { id: "lda", label: "LDA Filings" },
  { id: "contractors", label: "Contractors" },
  { id: "bills", label: "Congress Bills" },
  { id: "federal-register", label: "Federal Register" },
  { id: "hearings", label: "Hearings" },
  { id: "gao", label: "GAO" },
  { id: "crs", label: "CRS" },
  { id: "fec", label: "FEC" },
  { id: "fara", label: "FARA" },
  { id: "sec", label: "SEC" },
  { id: "sam", label: "SAM.gov" },
  { id: "awards", label: "DoD Awards" },
  { id: "grant-awards", label: "Grant Awards" },
  { id: "grants", label: "Grant Opps" },
  { id: "state-bills", label: "State Bills" },
  { id: "state-legislators", label: "State Legislators" },
];
const title = (r: ExplorerRecord) =>
  r.title ||
  r.name ||
  r.clientName ||
  r.companyName ||
  r.registrantName ||
  r.recipientName ||
  r.contributorName ||
  r.id;
const sourceUrl = (r: ExplorerRecord) =>
  r.sourceUrl || r.htmlUrl || r.url || r.link;
export function DataExplorer({
  initialDataset = "bills",
}: {
  initialDataset?: ExplorerDataset;
}) {
  const { params, page, update } = useIntelligenceLocation();
  const dataset =
    datasets.find((item) => item.id === params.get("dataset"))?.id ??
    initialDataset;
  const q = (params.get("q") ?? "").slice(0, 2000);
  const congress = params.get("congress") ?? "";
  const chamber = params.get("chamber") ?? "";
  const party = params.get("party") ?? "";
  const subject = params.get("subject") ?? "";
  const sort = params.get("sort") ?? "";
  function filter(key: string, value: string, replace = false) {
    update({ [key]: value, page: null, record: null }, replace);
  }
  function setPage(value: number) {
    update({ page: String(value), record: null });
  }
  function chooseDataset(value: ExplorerDataset, nextSort = "") {
    update({
      dataset: value,
      sort: nextSort,
      page: null,
      record: null,
      congress: null,
      chamber: null,
      party: null,
      subject: null,
    });
  }
  const facets = useCapiroQuery(
    "intelligence.explorer.bill-facets",
    {},
    { enabled: dataset === "bills" },
  );
  const queryInput = {
    q,
    page,
    pageSize: 25,
    sort: sort || undefined,
    ...(dataset === "bills"
      ? {
          congress: congress ? [congress] : undefined,
          originChamber: chamber ? [chamber] : undefined,
          sponsorParty: party ? [party] : undefined,
          subjects: subject ? [subject] : undefined,
        }
      : {}),
  };
  const query = useCapiroQuery(explorerDatasetOperations[dataset], {
    query: queryInput,
  });
  const selectionKey = JSON.stringify([dataset, queryInput]);
  const [selection, setSelection] = useState<{ key: string; ids: string[] }>({
    key: "",
    ids: [],
  });
  const selectedIds = selection.key === selectionKey ? selection.ids : [];
  const bill = dataset === "bills";
  const rows = query.data?.rows || [];
  const selected = rows.find((row) => row.id === params.get("record"));
  return (
    <>
      <nav className={styles.datasets} aria-label="Data sources">
        {datasets.map((d) => (
          <button
            key={d.id}
            className={`${styles.dataset} ${dataset === d.id ? styles.selected : ""}`}
            aria-pressed={dataset === d.id}
            onClick={() => {
              chooseDataset(d.id);
            }}
          >
            {d.label}
          </button>
        ))}
        <button
          className={styles.dataset}
          onClick={() => {
            chooseDataset("federal-register", "comment-close");
          }}
        >
          Comment Deadlines
        </button>
      </nav>
      <div className={styles.toolbar}>
        <TextInput
          aria-label="Search records"
          placeholder={`Search ${datasets.find((d) => d.id === dataset)?.label.toLowerCase()}`}
          value={q}
          onChange={(e) => {
            filter("q", e.target.value, true);
          }}
        />
        {bill && (
          <>
            <select
              className={styles.select}
              aria-label="Congress"
              value={congress}
              onChange={(e) => {
                filter("congress", e.target.value);
              }}
            >
              <option value="">Congress · Any</option>
              {facets.data?.congresses.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select
              className={styles.select}
              aria-label="Chamber"
              value={chamber}
              onChange={(e) => {
                filter("chamber", e.target.value);
              }}
            >
              <option value="">Chamber · Any</option>
              {facets.data?.chambers.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select
              className={styles.select}
              aria-label="Sponsor party"
              value={party}
              onChange={(e) => {
                filter("party", e.target.value);
              }}
            >
              <option value="">Party · Any</option>
              {facets.data?.parties.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select
              className={styles.select}
              aria-label="Subject"
              value={subject}
              onChange={(e) => {
                filter("subject", e.target.value);
              }}
            >
              <option value="">Subject · Any</option>
              {facets.data?.subjects.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select
              className={styles.select}
              aria-label="Sort bills"
              value={sort}
              onChange={(e) => {
                filter("sort", e.target.value);
              }}
            >
              <option value="">Latest action</option>
              <option value="introduced">Introduced</option>
              <option value="cosponsors">Cosponsors</option>
            </select>
          </>
        )}
        <ActionButton
          onClick={() => {
            update({
              q: null,
              congress: null,
              chamber: null,
              party: null,
              subject: null,
              sort: null,
              page: null,
              record: null,
            });
          }}
        >
          Clear all
        </ActionButton>
      </div>
      {selected && dataset === "bills" && (
        <div className={styles.actions}>
          <SaveBillToLegiWatch record={selected} />
        </div>
      )}
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        <div className={styles.split}>
          <Panel
            title={
              query.data
                ? `${query.data.total.toLocaleString()} records · showing ${query.data.total === 0 ? 0 : (page - 1) * 25 + 1} to ${Math.min(page * 25, query.data.total)}`
                : "Data Explorer"
            }
          >
            <ExplorerExports
              key={selectionKey}
              dataset={dataset}
              query={queryInput}
              rows={rows}
              selected={rows.filter((row) => selectedIds.includes(row.id))}
              total={query.data?.total ?? 0}
            />
            <DataTable
              rows={rows}
              rowKey={(r) => r.id}
              caption={
                datasets.find((d) => d.id === dataset)?.label || "Records"
              }
              columns={[
                {
                  key: "selection",
                  label: "Select for export",
                  render: (r) => (
                    <input
                      type="checkbox"
                      aria-label={`Select ${title(r)} for export`}
                      checked={selectedIds.includes(r.id)}
                      onChange={(event) =>
                        setSelection({
                          key: selectionKey,
                          ids: event.target.checked
                            ? [...selectedIds, r.id]
                            : selectedIds.filter((id) => id !== r.id),
                        })
                      }
                    />
                  ),
                },
                {
                  key: "title",
                  label: bill ? "Bill / title" : "Record / title",
                  render: (r) => (
                    <button
                      className={styles.link}
                      onClick={() => update({ record: r.id })}
                    >
                      {bill
                        ? [r.billType?.toUpperCase(), r.billNumber]
                            .filter(Boolean)
                            .join(" ") + " · "
                        : ""}
                      {title(r)}
                    </button>
                  ),
                },
                {
                  key: "source",
                  label: bill ? "Sponsor" : "Agency / source",
                  render: (r) =>
                    bill
                      ? [
                          r.sponsorName,
                          r.sponsorParty &&
                            `(${r.sponsorParty}-${r.sponsorState || ""})`,
                        ]
                          .filter(Boolean)
                          .join(" ")
                      : r.agency ||
                        r.agencyNames?.join(", ") ||
                        r.source ||
                        r.registrantName ||
                        "—",
                },
                {
                  key: "count",
                  label: bill ? "Cosponsors" : "Type / amount",
                  render: (r) =>
                    bill
                      ? (r.cosponsorsCount ?? "—")
                      : (r.type ?? r.amount ?? r.awardAmount ?? "—"),
                },
                {
                  key: "action",
                  label: bill ? "Latest action" : "Date / status",
                  render: (r) =>
                    r.latestActionText ||
                    r.commentEndDate ||
                    r.publishedAt ||
                    r.publicationDate ||
                    r.postedDate ||
                    r.status ||
                    "—",
                },
              ]}
            />
            <footer className={styles.footer}>
              <span>Page {page}</span>
              <div className={styles.actions}>
                <ActionButton
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </ActionButton>
                <ActionButton
                  disabled={page * 25 >= (query.data?.total || 0)}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </ActionButton>
              </div>
            </footer>
          </Panel>
          {selected && (
            <Panel
              title={title(selected)}
              description={datasets.find((d) => d.id === dataset)?.label}
            >
              <dl className={styles.details}>
                {[
                  ["Sponsor", selected.sponsorName],
                  ["Policy area", selected.policyArea],
                  [
                    "Agency",
                    selected.agency || selected.agencyNames?.join(", "),
                  ],
                  ["Latest action", selected.latestActionText],
                  ["Comment deadline", selected.commentEndDate],
                  ["Status", selected.status],
                  ["Source", selected.source],
                ]
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
              </dl>
              {sourceUrl(selected) &&
                /^https?:\/\//.test(sourceUrl(selected)!) && (
                  <div className={styles.actions}>
                    <a
                      href={sourceUrl(selected)!}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open source ↗
                    </a>
                  </div>
                )}
              {selected.summary && (
                <p className={styles.content}>{selected.summary}</p>
              )}
            </Panel>
          )}
        </div>
      </StatusPanel>
    </>
  );
}
