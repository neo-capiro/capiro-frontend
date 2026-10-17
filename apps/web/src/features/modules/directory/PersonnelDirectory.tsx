"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  DataTable,
  Panel,
  StatusPanel,
  TextInput,
} from "../../../shared/module-ui";
import { DirectoryPagination } from "./DirectoryPagination";
import { PersonnelProfile } from "./PersonnelProfile";
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
  const requestedQ = params.get("personnelQ") ?? "";
  const q = requestedQ.length <= 500 ? requestedQ : "";
  const requestedService = params.get("personnelService") ?? "";
  const service = services.includes(requestedService) ? requestedService : "";
  const requestedAligned = params.get("personnelAligned");
  const aligned =
    requestedAligned === "aligned" || requestedAligned === "unaligned"
      ? requestedAligned
      : "";
  const requestedPage = params.get("personnelPage") ?? "";
  const page = /^[1-9]\d{0,5}$/.test(requestedPage) ? Number(requestedPage) : 1;
  const listScope = JSON.stringify([q, service, aligned, page]);
  const [selection, setSelection] = useState<{
    id: string;
    scope: string;
  } | null>(null);
  const selectedId = selection?.scope === listScope ? selection.id : null;
  const detailChangeRef = useRef(onDetailChange);
  const previousScope = useRef(listScope);
  const updateFilters = (
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
  useEffect(() => {
    detailChangeRef.current = onDetailChange;
  }, [onDetailChange]);
  useEffect(() => () => detailChangeRef.current?.(false), []);
  useEffect(() => {
    if (previousScope.current !== listScope) {
      previousScope.current = listScope;
      setSelection(null);
      detailChangeRef.current?.(false);
    }
  }, [listScope]);
  const closeDetail = () => {
    setSelection(null);
    onDetailChange?.(false);
  };
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
              updateFilters(
                {
                  personnelQ: e.target.value.slice(0, 500),
                  personnelPage: "",
                },
                "replace",
              );
            }}
          />
          <select
            className={styles.select}
            aria-label="Service"
            value={service}
            onChange={(e) => {
              updateFilters({
                personnelService: services.includes(e.target.value)
                  ? e.target.value
                  : "",
                personnelPage: "",
              });
            }}
          >
            <option value="">Service · Any</option>
            {services.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <select
            className={styles.select}
            aria-label="PE alignment"
            value={aligned}
            onChange={(e) => {
              updateFilters({
                personnelAligned:
                  e.target.value === "aligned" || e.target.value === "unaligned"
                    ? e.target.value
                    : "",
                personnelPage: "",
              });
            }}
          >
            <option value="">PE alignment · Any</option>
            <option value="aligned">PE aligned</option>
            <option value="unaligned">Unaligned</option>
          </select>
          <ActionButton
            onClick={() => {
              updateFilters({
                personnelQ: "",
                personnelService: "",
                personnelAligned: "",
                personnelPage: "",
              });
            }}
          >
            Clear all
          </ActionButton>
        </div>
        <StatusPanel
          loading={query.loading}
          error={query.error}
          onRetry={query.reload}
        >
          <Panel
            title={
              query.data ? `${query.data.total} personnel` : "Department of War"
            }
          >
            <DataTable
              rows={query.data?.data || []}
              rowKey={(r) => r.id}
              caption="Defense personnel directory"
              columns={[
                {
                  key: "name",
                  label: "Name / title",
                  render: (r) => (
                    <>
                      <button
                        type="button"
                        className={styles.link}
                        onClick={() => {
                          setSelection({ id: r.id, scope: listScope });
                          onDetailChange?.(true);
                        }}
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
                  render: (r) =>
                    r.email ||
                    (r.publicProfileUrl && (
                      <a
                        href={
                          /^https?:\/\//.test(r.publicProfileUrl)
                            ? r.publicProfileUrl
                            : undefined
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        Public profile
                      </a>
                    )) ||
                    "Not available",
                },
              ]}
            />
            <DirectoryPagination
              page={page}
              total={query.data?.total || 0}
              pageSize={25}
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
        </StatusPanel>
      </div>
    </>
  );
}
