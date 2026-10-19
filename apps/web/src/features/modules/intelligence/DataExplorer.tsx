"use client";
import { useState } from "react";
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
  const [dataset, setDataset] = useState<ExplorerDataset>(initialDataset);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [congress, setCongress] = useState("");
  const [chamber, setChamber] = useState("");
  const [party, setParty] = useState("");
  const [subject, setSubject] = useState("");
  const [sort, setSort] = useState("");
  const [selected, setSelected] = useState<ExplorerRecord>();
  const facets = useCapiroQuery(
    "intelligence.explorer.bill-facets",
    {},
    { enabled: dataset === "bills" },
  );
  const query = useCapiroQuery(explorerDatasetOperations[dataset], {
    query: {
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
    },
  });
  const bill = dataset === "bills";
  const rows = query.data?.rows || [];
  return (
    <>
      <nav className={styles.datasets} aria-label="Data sources">
        {datasets.map((d) => (
          <button
            key={d.id}
            className={`${styles.dataset} ${dataset === d.id ? styles.selected : ""}`}
            aria-pressed={dataset === d.id}
            onClick={() => {
              setDataset(d.id);
              setPage(1);
              setSelected(undefined);
              setSort("");
            }}
          >
            {d.label}
          </button>
        ))}
        <button
          className={styles.dataset}
          onClick={() => {
            setDataset("federal-register");
            setSelected(undefined);
            setSort("comment-close");
            setPage(1);
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
            setQ(e.target.value);
            setPage(1);
          }}
        />
        {bill && (
          <>
            <select
              className={styles.select}
              aria-label="Congress"
              value={congress}
              onChange={(e) => {
                setCongress(e.target.value);
                setPage(1);
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
                setChamber(e.target.value);
                setPage(1);
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
                setParty(e.target.value);
                setPage(1);
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
                setSubject(e.target.value);
                setPage(1);
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
                setSort(e.target.value);
                setPage(1);
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
            setQ("");
            setCongress("");
            setChamber("");
            setParty("");
            setSubject("");
            setPage(1);
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
                ? `${query.data.total.toLocaleString()} records · showing ${(page - 1) * 25 + 1} to ${Math.min(page * 25, query.data.total)}`
                : "Data Explorer"
            }
          >
            <DataTable
              rows={rows}
              rowKey={(r) => r.id}
              caption={
                datasets.find((d) => d.id === dataset)?.label || "Records"
              }
              columns={[
                {
                  key: "title",
                  label: bill ? "Bill / title" : "Record / title",
                  render: (r) => (
                    <button
                      className={styles.link}
                      onClick={() => setSelected(r)}
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
