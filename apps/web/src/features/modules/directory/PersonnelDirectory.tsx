"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  Badge,
  DataTable,
  Panel,
  SelectInput,
  StatusPanel,
  TextInput,
} from "../../../shared/module-ui";
import { DirectoryPagination } from "./DirectoryPagination";
import { PersonnelPreview } from "./PersonnelPreview";
import { PersonnelProfile } from "./PersonnelProfile";
import { externalUrl } from "./personnel-links";
import {
  isPersonnelId,
  readPersonnelId,
  readPersonnelPreviewId,
} from "./personnel-selection";
import styles from "./directory.module.css";

const services = ["Army", "Navy", "Air Force", "Space Force", "Defense-wide"];

export function PersonnelDirectory({
  onDetailChange,
}: {
  onDetailChange?: (open: boolean) => void;
}) {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  // Searched text stays in local state: writing it into the address bar both
  // churns history on every keystroke and exposes the query to edge rules that
  // answer SQL/HTML-shaped input with a bare 403 page. A link may still seed it.
  const initialQ = params.get("personnelQ") ?? "";
  const [q, setQ] = useState(initialQ.length <= 500 ? initialQ : "");
  const requestedService = params.get("personnelService") ?? "";
  const service = services.includes(requestedService) ? requestedService : "";
  const requestedAligned = params.get("personnelAligned");
  const aligned =
    requestedAligned === "aligned" || requestedAligned === "unaligned"
      ? requestedAligned
      : "";
  const requestedPage = params.get("personnelPage") ?? "";
  const page = /^[1-9]\d{0,5}$/.test(requestedPage) ? Number(requestedPage) : 1;
  const requestedId = readPersonnelId(params);
  const requestedPreviewId = readPersonnelPreviewId(params);
  const detailChangeRef = useRef(onDetailChange);
  const updateParams = (
    updates: Record<string, string>,
    history: "push" | "replace" = "push",
  ) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    const queryString = next.toString();
    router[history](`${pathname}${queryString ? `?${queryString}` : ""}`, {
      scroll: false,
    });
  };
  // A seeded `personnelQ` only initialises the search box. Any filter edit
  // drops it, so a reload cannot re-apply a query the person has moved on from.
  const updateFilters = (
    updates: Record<string, string>,
    history: "push" | "replace" = "push",
  ) =>
    updateParams(
      {
        ...updates,
        personnelQ: "",
        personnelId: "",
        personnelPreviewId: "",
      },
      history,
    );
  useEffect(() => {
    detailChangeRef.current = onDetailChange;
  }, [onDetailChange]);
  useEffect(() => () => detailChangeRef.current?.(false), []);
  const query = useCapiroQuery("directory.personnel", {
    query: {
      q,
      service: service || undefined,
      pe_aligned: aligned || undefined,
      page,
      limit: 25,
      sort: "pe_first",
    },
  });
  // The URL is navigation state, not authority: a detail can only be restored
  // from a current row in this exact list scope.
  const selectedId =
    !query.loading &&
    !query.error &&
    requestedId &&
    query.data?.data.some((row) => row.id === requestedId)
      ? requestedId
      : null;
  const selectedPerson =
    !query.loading && !query.error && (selectedId || requestedPreviewId)
      ? query.data?.data.find(
          (row) => row.id === (selectedId || requestedPreviewId),
        )
      : undefined;
  const closeDetail = () => {
    onDetailChange?.(false);
    updateParams(
      { personnelId: "", personnelPreviewId: selectedId || "" },
      "replace",
    );
  };
  const selectPreview = (id: string) => {
    if (isPersonnelId(id)) updateParams({ personnelPreviewId: id });
  };
  useEffect(() => {
    if (!query.loading || requestedId === null)
      onDetailChange?.(selectedId !== null);
  }, [onDetailChange, query.loading, requestedId, selectedId]);
  // The list endpoint clamps `total` to the page size when a query is active, so
  // a full page is the only evidence that more matches exist.
  const personnelRows = query.data?.data ?? [];
  const pageHasMore = personnelRows.length === 25;
  const pageEnd = (page - 1) * 25 + personnelRows.length;
  const totalKnown = (query.data?.total ?? 0) > pageEnd;
  const personnelTitle = !query.data
    ? "Department of War"
    : totalKnown
      ? `${query.data.total.toLocaleString()} personnel`
      : pageHasMore
        ? `Showing ${(page - 1) * 25 + 1}–${pageEnd} personnel`
        : `${pageEnd.toLocaleString()} personnel`;
  return (
    <>
      {selectedId && <PersonnelProfile id={selectedId} onBack={closeDetail} />}
      <div hidden={selectedId !== null}>
        <div className={styles.toolbar}>
          <TextInput
            aria-label="Search defense personnel"
            placeholder="Name, office, program or PE…"
            value={q}
            maxLength={500}
            onChange={(e) => {
              setQ(e.target.value.slice(0, 500));
              if (page !== 1 || params.has("personnelQ"))
                updateFilters({ personnelPage: "" }, "replace");
            }}
          />
          <SelectInput
            aria-label="Service"
            value={service}
            onValueChange={(next) => {
              updateFilters({
                personnelService: services.includes(next) ? next : "",
                personnelPage: "",
              });
            }}
            options={[
              { value: "", label: "Service · Any" },
              ...services.map((x) => ({ value: x, label: x })),
            ]}
          />
          <SelectInput
            aria-label="PE alignment"
            value={aligned}
            onValueChange={(next) => {
              updateFilters({
                personnelAligned:
                  next === "aligned" || next === "unaligned" ? next : "",
                personnelPage: "",
              });
            }}
            options={[
              { value: "", label: "PE alignment · Any" },
              { value: "aligned", label: "PE aligned" },
              { value: "unaligned", label: "Unaligned" },
            ]}
          />
          <button
            type="button"
            className={styles.clearAll}
            onClick={() => {
              setQ("");
              updateFilters({
                personnelService: "",
                personnelAligned: "",
                personnelPage: "",
              });
            }}
          >
            Clear all
          </button>
        </div>
        <StatusPanel
          loading={query.loading}
          error={query.error}
          onRetry={query.reload}
        >
          <div className={styles.personnelSplit}>
            <Panel title={personnelTitle}>
              <DataTable
                rows={personnelRows}
                rowKey={(r) => r.id}
                caption="Defense personnel directory"
                selectedRowKey={selectedPerson?.id}
                onRowActivate={(row) => selectPreview(row.id)}
                rowActionLabel={(row) => `Preview ${row.fullName}`}
                columns={[
                  {
                    key: "name",
                    label: "Name / title",
                    render: (r) => (
                      <>
                        <button
                          type="button"
                          className={styles.link}
                          aria-pressed={selectedPerson?.id === r.id}
                          onClick={() => selectPreview(r.id)}
                        >
                          <strong>{r.fullName}</strong>
                        </button>
                        <div className={styles.muted}>
                          {r.title || r.role || "Title not provided"}
                        </div>
                      </>
                    ),
                  },
                  {
                    key: "office",
                    label: "Office / organization",
                    render: (r) => r.organization || "—",
                  },
                  {
                    key: "service",
                    label: "Service",
                    render: (r) => r.service || "—",
                  },
                  {
                    key: "pe",
                    label: "Program elements",
                    render: (r) => (
                      <>
                        {[r.pePrimary, ...r.peSecondary]
                          .filter(Boolean)
                          .map((pe) => (
                            <a
                              key={pe}
                              href={`/modules/intelligence?view=defense-budget&peCode=${encodeURIComponent(pe || "")}`}
                            >
                              {pe}{" "}
                            </a>
                          ))}
                      </>
                    ),
                  },
                  {
                    key: "status",
                    label: "Evidence",
                    render: (r) => (
                      <Badge>
                        {r.status} · {r.sourceCount} sources
                      </Badge>
                    ),
                  },
                  {
                    key: "contact",
                    label: "Contact",
                    render: (r) => {
                      if (r.email) return r.email;
                      const profileUrl = externalUrl(r.publicProfileUrl);
                      return profileUrl ? (
                        <a
                          href={profileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Public profile
                        </a>
                      ) : (
                        "Not available"
                      );
                    },
                  },
                ]}
              />
              <DirectoryPagination
                page={page}
                total={query.data?.total || 0}
                pageSize={25}
                shown={personnelRows.length}
                hasMore={pageHasMore}
                onPage={(nextPage) =>
                  updateFilters({
                    personnelPage:
                      Number.isInteger(nextPage) &&
                      nextPage >= 1 &&
                      nextPage <= 999999
                        ? String(nextPage)
                        : "",
                  })
                }
              />
            </Panel>
            <PersonnelPreview
              person={selectedPerson}
              onOpen={() => {
                if (!selectedPerson) return;
                onDetailChange?.(true);
                updateParams({
                  personnelId: selectedPerson.id,
                  personnelPreviewId: selectedPerson.id,
                });
              }}
            />
          </div>
        </StatusPanel>
      </div>
    </>
  );
}
