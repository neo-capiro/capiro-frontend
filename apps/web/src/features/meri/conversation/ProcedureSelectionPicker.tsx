"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useCapiro } from "../../../shared/capiro/CapiroBoundary";
import {
  ProcedureCatalogUnavailable,
  loadProcedureCatalog,
  selectorIdentity,
} from "../../../shared/capiro/operations/meri-procedures";
import { ConversationReadUnavailable } from "../../../shared/meri-conversations/current-reads";
import { CapiroApiError } from "../../../shared/capiro/http";
import {
  withProcedureSelection,
  type ConversationSkillSelection,
} from "../../../shared/meri-conversations/query-journal";
import { useCurrentRead } from "./evidence/useCurrentRead";
import {
  procedureDetail,
  procedureName,
  procedureOptionLabel,
} from "./procedure-presentation";
import styles from "../model-selection/model-selection.module.css";

/**
 * The native procedure control in the conversation composer — Wave5 MO01/ST16.
 *
 * It lists exactly what Core currently offers this account and tenant: the six canonical built-ins and
 * the eligible firm procedures, with a readable name, Core's own purpose and scopes for a firm
 * procedure, and the exact selector as the value only. Choosing here is never execution — nothing is
 * dispatched until the ordinary send path runs, and Core re-resolves the procedure, its version, its
 * digest and the caller's client access at that point. The catalog grants no tools, no budget and no
 * approval.
 *
 * The read belongs to one account, tenant, client and session lifetime: a newer lifetime starts a new
 * read, a late answer for an older one is dropped, and a chosen procedure that the current catalog no
 * longer lists exactly — disabled, removed, or carrying a new version or digest — leaves the draft
 * instead of standing.
 */
export function ProcedureSelectionPicker({
  tenantId,
  lifetime,
  selection,
  disabled,
  onChange,
  onProcedureName,
}: {
  tenantId: string;
  lifetime: string;
  selection: ConversationSkillSelection;
  disabled: boolean;
  onChange: (selection: ConversationSkillSelection) => void;
  /**
   * Reports the accepted catalog's own name for the applied procedure, keyed to its exact selector,
   * so the composer chip can show that name. Presentation only: the selection itself is unchanged.
   */
  onProcedureName?: (identity: string, name: string) => void;
}) {
  const api = useCapiro();
  const [retiredChoice, setRetiredChoice] = useState<string>();
  /**
   * The read is issued once per account, tenant, client and session lifetime, and what it does when it
   * answers is decided against the selection that is current at that moment — so a refresh can never
   * race a choice the person has just made, and the read's identity never changes with the selection.
   */
  const latest = useRef({
    selection,
    appliedIdentity: undefined as string | undefined,
    onChange,
  });
  const applied = selection.procedure;
  const appliedIdentity = applied ? selectorIdentity(applied) : undefined;
  useEffect(() => {
    latest.current = { selection, appliedIdentity, onChange };
  });
  const read = useCallback(
    async (signal: AbortSignal) => {
      const catalog = await loadProcedureCatalog(api, {
        tenantId,
        signal,
      }).catch((error: unknown) => {
        // A refusal is a closed reason; the person is told which one it was.
        if (error instanceof ProcedureCatalogUnavailable)
          throw new ConversationReadUnavailable(
            503,
            `PROCEDURE_CATALOG_${error.reason.replace("-", "_").toUpperCase()}`,
          );
        // The transport refuses a body that is not the registered shape with its own 502, which is
        // the same reading: nothing here was the reviewed catalog.
        if (error instanceof CapiroApiError && error.status === 502)
          throw new ConversationReadUnavailable(
            503,
            "PROCEDURE_CATALOG_MALFORMED",
          );
        throw error;
      });
      // A fresh catalog is the current owner: a chosen procedure it no longer lists exactly — disabled,
      // removed, or carrying a new version or digest — leaves the draft, and the person is told why.
      const current = latest.current;
      if (
        current.appliedIdentity &&
        !catalog.entries.some(
          (entry) =>
            selectorIdentity(entry.selector) === current.appliedIdentity,
        )
      ) {
        setRetiredChoice(current.appliedIdentity);
        current.onChange(withProcedureSelection(current.selection, undefined));
      }
      return catalog;
    },
    [api, tenantId],
  );
  const {
    value: catalog,
    error,
    loading,
    reload,
  } = useCurrentRead(lifetime, read);
  const appliedEntry = catalog?.entries.find(
    (entry) => selectorIdentity(entry.selector) === appliedIdentity,
  );
  /**
   * The catalog is the only source of a procedure's name, so the name it gives for exactly the
   * applied selector is reported to the owner of the chip that shows it. Presentation only: the
   * selector, its identity and the sent request are untouched.
   */
  const appliedName = appliedEntry
    ? procedureName(appliedEntry.selector, appliedEntry.display.label)
    : undefined;
  const report = useRef(onProcedureName);
  useEffect(() => {
    report.current = onProcedureName;
  });
  useEffect(() => {
    if (appliedIdentity && appliedName)
      report.current?.(appliedIdentity, appliedName);
  }, [appliedIdentity, appliedName]);

  function choose(identity: string) {
    setRetiredChoice(undefined);
    if (identity === "") {
      onChange(withProcedureSelection(selection, undefined));
      return;
    }
    const entry = catalog?.entries.find(
      (candidate) => selectorIdentity(candidate.selector) === identity,
    );
    // Only what the current catalog actually offers can be selected.
    if (entry) onChange(withProcedureSelection(selection, entry.selector));
  }

  const chosen =
    appliedName ??
    (applied ? `${procedureName(applied)} (not listed now)` : "No procedure");
  const problem = error
    ? error === "PROCEDURE_CATALOG_FOREIGN_TENANT"
      ? "This catalog came back for a different tenant, so nothing is listed."
      : error === "PROCEDURE_CATALOG_MALFORMED"
        ? "The catalog could not be read in its expected shape, so nothing is listed."
        : error === "PROCEDURE_CATALOG_INCONSISTENT"
          ? "The catalog disagreed with itself, so nothing is listed."
          : "The procedure catalog is unavailable to this account right now."
    : undefined;
  const builtins = (catalog?.entries ?? []).filter(
    (entry) => entry.selector.source === "builtin",
  );
  const firm = (catalog?.entries ?? []).filter(
    (entry) => entry.selector.source === "firm",
  );
  const detail = appliedEntry ? procedureDetail(appliedEntry) : undefined;

  return (
    <details className={styles.picker}>
      <summary className={styles.trigger}>
        {/* Same composer trigger convention as Skill and Work: the full value stays for assistive
            technology. */}
        <span className="sr-only">Procedure for next message: </span>
        <span className={styles.value}>Procedure · {chosen}</span>
        <ChevronDown aria-hidden />
      </summary>
      <p className={styles.help}>
        A procedure shapes how Meri handles your next message. Your access is
        checked when you send, and Meri may still decline.
      </p>
      {loading ? (
        <p className={styles.help} role="status">
          Loading the current procedure catalog…
        </p>
      ) : null}
      {problem ? (
        <p className={styles.help} role="alert">
          {problem}
        </p>
      ) : null}
      {catalog ? (
        <label className={styles.field}>
          <span>Procedure for the next message</span>
          <select
            className={styles.trigger}
            value={appliedIdentity ?? ""}
            disabled={disabled || loading}
            onChange={(event) => choose(event.target.value)}
          >
            <option value="">No procedure — ordinary conversation</option>
            {builtins.length > 0 ? (
              <optgroup label="Built-in">
                {builtins.map((entry) => (
                  <option
                    key={selectorIdentity(entry.selector)}
                    value={selectorIdentity(entry.selector)}
                  >
                    {procedureOptionLabel(entry)}
                  </option>
                ))}
              </optgroup>
            ) : null}
            {firm.length > 0 ? (
              <optgroup label="Your firm">
                {firm.map((entry) => (
                  <option
                    key={selectorIdentity(entry.selector)}
                    value={selectorIdentity(entry.selector)}
                  >
                    {procedureOptionLabel(entry)}
                  </option>
                ))}
              </optgroup>
            ) : null}
          </select>
        </label>
      ) : null}
      {detail ? <p className={styles.help}>{detail}</p> : null}
      {retiredChoice ? (
        <p className={styles.help} role="alert">
          That procedure is no longer offered to this account, so it was removed
          from the draft.
        </p>
      ) : null}
      <button
        className={styles.trigger}
        type="button"
        disabled={disabled || loading}
        onClick={reload}
      >
        Refresh the catalog
      </button>
    </details>
  );
}
