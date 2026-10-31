"use client";
import { useState } from "react";
import type { DirectoryCommittee } from "../../../shared/capiro/operations/directory-schemas";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  DataTable,
  Panel,
  SelectInput,
  StatusPanel,
  TextInput,
} from "../../../shared/module-ui";
import { DirectoryPagination } from "./DirectoryPagination";
import styles from "./directory.module.css";
export function CommitteeDirectory() {
  const [q, setQ] = useState("");
  const [chamber, setChamber] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<DirectoryCommittee>();
  const committees = useCapiroQuery("directory.committees", {
    query: { q, chamber: chamber || undefined, page, pageSize: 25 },
  });
  const staff = useCapiroQuery(
    "directory.committee.staff",
    {
      params: { committeeId: selected?.id || "" },
      query: { page: 1, pageSize: 100 },
    },
    { enabled: !!selected },
  );
  return (
    <>
      <div className={styles.toolbar}>
        <TextInput
          aria-label="Search committee staff"
          placeholder="Name, role or committee…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        <SelectInput
          aria-label="Committee chamber"
          value={chamber}
          onValueChange={(next) => {
            setChamber(next);
            setPage(1);
          }}
          options={[
            { value: "", label: "Chamber · Any" },
            ...["House", "Senate", "Joint"].map((x) => ({
              value: x,
              label: x,
            })),
          ]}
        />
        <button
          type="button"
          className={styles.clearAll}
          onClick={() => {
            setQ("");
            setChamber("");
            setPage(1);
          }}
        >
          Clear all
        </button>
      </div>
      <StatusPanel
        loading={committees.loading}
        error={committees.error}
        onRetry={committees.reload}
      >
        <div className={styles.split}>
          <Panel
            title={
              committees.data
                ? `${committees.data.total} committees with staff contacts`
                : "Committee Staff"
            }
          >
            <DataTable
              rows={committees.data?.committees || []}
              rowKey={(r) => r.id}
              caption="Committee staff directory"
              columns={[
                {
                  key: "name",
                  label: "Committee",
                  render: (r) => (
                    <button
                      className={styles.link}
                      onClick={() => setSelected(r)}
                    >
                      <strong>{r.name}</strong>
                      <div className={styles.muted}>
                        {r.chamber} · {r.kind}
                      </div>
                    </button>
                  ),
                },
                { key: "staff", label: "Staff", render: (r) => r.staffCount },
                {
                  key: "office",
                  label: "Office",
                  render: (r) => r.officeLocation || "—",
                },
                {
                  key: "phone",
                  label: "Contact",
                  render: (r) => r.phone || "—",
                },
              ]}
            />
            <DirectoryPagination
              page={page}
              total={committees.data?.total || 0}
              pageSize={25}
              onPage={setPage}
            />
          </Panel>
          {selected && (
            <Panel
              title={selected.name}
              description={`${selected.chamber} · ${selected.kind}`}
            >
              <dl className={styles.details}>
                <div>
                  <dt>Chair</dt>
                  <dd>{selected.chair?.name || "Not provided"}</dd>
                </div>
                <div>
                  <dt>Ranking</dt>
                  <dd>{selected.rankingMember?.name || "Not provided"}</dd>
                </div>
                <div>
                  <dt>Office</dt>
                  <dd>{selected.officeLocation || "Not provided"}</dd>
                </div>
              </dl>
              <StatusPanel
                loading={staff.loading}
                error={staff.error}
                onRetry={staff.reload}
              >
                {staff.data?.staff.map((s) => (
                  <div key={s.id} className={styles.row}>
                    <span>
                      {s.fullName}
                      <div className={styles.muted}>{s.title}</div>
                    </span>
                    <span>{s.email || s.phone || "Not provided"}</span>
                  </div>
                ))}
              </StatusPanel>
            </Panel>
          )}
        </div>
      </StatusPanel>
    </>
  );
}
