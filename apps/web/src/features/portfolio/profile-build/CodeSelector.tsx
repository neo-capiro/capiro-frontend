"use client";
import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useApi } from "@/shared/portfolio/api/provider";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { useProfileBuildAccess } from "./queries";
import styles from "./profile-build.module.css";

export type CodeKind = "naics" | "psc" | "lda";
const references = z.object({
  items: z.array(z.object({ code: z.string(), label: z.string() })),
});
export function validCode(kind: CodeKind, value: string) {
  return (
    kind === "naics"
      ? /^\d{2,6}$/
      : kind === "psc"
        ? /^[A-Z0-9]{4}$/
        : /^[A-Z]{3}$/
  ).test(value);
}
export function CodeSelector({
  kind,
  label,
  value,
  onChange,
  error,
  children,
}: {
  kind: CodeKind;
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
  children?: ReactNode;
}) {
  const api = useApi();
  const { canRead, identity } = useProfileBuildAccess();
  const [search, setSearch] = useState("");
  const [referenceLabels, setReferenceLabels] = useState<
    Record<string, string>
  >({});
  const [expanded, setExpanded] = useState(false);
  const query = useQuery({
    queryKey: [
      "profile-code-references",
      identity.data?.tenant?.id,
      identity.data?.user.id,
      kind,
      search.trim(),
    ],
    enabled: canRead && expanded,
    queryFn: ({ signal }) =>
      api.request(
        "core",
        `clients/profile-build/references?${new URLSearchParams({ kind, q: search.trim() })}`,
        references,
        { signal },
      ),
  });
  const add = (code: string, referenceLabel?: string) => {
    setReferenceLabels((current) => ({
      ...current,
      [code]: referenceLabel ?? "Outside current reference results",
    }));
    onChange([...new Set([...value, code])]);
    setSearch("");
  };
  const code = search.trim().toUpperCase();
  return (
    <fieldset className={styles.codeSelector}>
      <legend>{label}</legend>
      <div className="row">
        {value.map((item) => (
          <span className="chip" key={item}>
            {item}
            <small>
              {referenceLabels[item] ??
                query.data?.items.find((row) => row.code === item)?.label ??
                "Reference status not checked"}
            </small>
            <button
              type="button"
              className="button ghost"
              aria-label={`Remove ${item}`}
              onClick={() => onChange(value.filter((v) => v !== item))}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        aria-label={`Search ${label}`}
        value={search}
        onFocus={() => setExpanded(true)}
        onChange={(e) => {
          setSearch(e.target.value);
          setExpanded(true);
        }}
        placeholder="Search by code or description"
        aria-invalid={Boolean(error)}
      />
      {error && <small className="danger">{error}</small>}
      {expanded && (
        <>
          <QueryState
            pending={query.isPending}
            error={query.error}
            retry={() => void query.refetch()}
          />
          <ul className={styles.codeResults}>
            {query.data?.items
              .filter((item) => !value.includes(item.code))
              .map((item) => (
                <li key={item.code}>
                  <button
                    type="button"
                    className="button ghost"
                    onClick={() => add(item.code, item.label)}
                  >
                    <strong>{item.code}</strong> {item.label}
                  </button>
                </li>
              ))}
          </ul>
          {query.isSuccess &&
            validCode(kind, code) &&
            !value.includes(code) &&
            !query.data.items.some((item) => item.code === code) && (
              <button
                type="button"
                className="button"
                onClick={() => add(code)}
              >
                Use {code} — outside current reference results
              </button>
            )}
          <button
            type="button"
            className="button ghost"
            onClick={() => setExpanded(false)}
          >
            Close search
          </button>
        </>
      )}
      <small className="muted">
        Enter verified codes or review a sourced suggestion before adding it.
      </small>
      {children}
    </fieldset>
  );
}
