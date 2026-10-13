import { ImportCandidateRow } from "./ImportCandidateRow";
import { AttemptStatus, PendingFields } from "../../ui/AttemptStatus";
import { ImportOutcome } from "../../ui/ImportOutcome";
import { Btn, Icon, Modal, Spinner } from "../../ui/primitives";
import { ErrorText } from "../funnel/shared";
import type { ImportWorkflow } from "./useImportWorkflow";
export { formatCompactSpend } from "./ImportCandidateRow";
type Props = Pick<
  ImportWorkflow,
  | "navigate"
  | "importer"
  | "candidatesQuery"
  | "setStageOverride"
  | "sel"
  | "setSel"
  | "importing"
  | "error"
  | "setError"
  | "candidates"
  | "registrantName"
  | "notImported"
  | "remaining"
  | "capHit"
  | "toggle"
  | "doImport"
  | "refreshCurrent"
> & {
  cap: number;
  imported: number;
  plan: "trial" | "paid";
  billingAdmin: boolean;
  onClose: () => void;
};
export function ImportCandidateSelection({
  navigate,
  importer,
  candidatesQuery,
  setStageOverride,
  sel,
  setSel,
  importing,
  error,
  setError,
  candidates,
  registrantName,
  notImported,
  remaining,
  capHit,
  toggle,
  doImport,
  refreshCurrent,
  cap,
  imported,
  plan,
  billingAdmin,
  onClose,
}: Props) {
  return (
    <Modal title="Import your clients" onClose={onClose} width={720}>
      <AttemptStatus
        record={importer.record}
        check={() => void refreshCurrent()}
      />
      <ImportOutcome evidence={importer.evidence} />
      <PendingFields disabled={importer.locked}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            margin: "-4px 0 12px",
          }}
        >
          <Icon name="Landmark" size={14} style={{ color: "var(--ink-3)" }} />
          <b style={{ fontSize: 12.5 }}>{registrantName}</b>
          <span style={{ fontSize: 12.5, color: "var(--ink-3)" }}>
            · {candidates.length} filed clients
          </span>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setStageOverride("search");
              setSel([]);
            }}
            style={{
              marginLeft: "auto",
              fontSize: 12.5,
              fontWeight: 600,
              color: "var(--accent)",
            }}
          >
            Change firm
          </a>
        </div>
        <div
          style={{
            border: "1px solid var(--border-1)",
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "34px 1fr 130px 70px 70px",
              alignItems: "center",
              padding: "8px 14px",
              background: "var(--bg-surface-2)",
              borderBottom: "1px solid var(--border-1)",
              fontSize: 10.5,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              fontWeight: 700,
              color: "var(--ink-3)",
            }}
          >
            <span></span>
            <span>Client</span>
            <span
              style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
            >
              Lobbying spend <Icon name="ChevronsUpDown" size={11} />
            </span>
            <span>Filings</span>
            <span>Latest</span>
          </div>
          <div style={{ maxHeight: 320, overflowY: "auto" }}>
            {candidatesQuery.isLoading && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  padding: "14px 14px",
                  fontSize: 12.5,
                  color: "var(--ink-2)",
                }}
              >
                <Spinner />
                Loading your filed clients…
              </div>
            )}
            {candidates.map((c, i) => (
              <ImportCandidateRow
                key={c.ldaClientId}
                candidate={c}
                index={i}
                count={candidates.length}
                selected={sel.includes(c.ldaClientId)}
                capHit={capHit}
                locked={importer.locked}
                toggle={toggle}
              />
            ))}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginTop: 12,
          }}
        >
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setSel(notImported.slice(0, remaining).map((c) => c.ldaClientId));
            }}
            style={{ fontSize: 12.5, fontWeight: 600, color: "var(--accent)" }}
          >
            Select all {notImported.length} not-yet-imported
          </a>
          <span
            style={{
              fontSize: 12,
              color: "var(--ink-3)",
              fontFamily: "var(--font-mono)",
              letterSpacing: 0,
            }}
          >
            {imported + sel.length} / {cap} profiles
          </span>
        </div>
        {capHit && notImported.length > sel.length && plan !== "paid" && (
          <div
            style={{
              marginTop: 12,
              display: "flex",
              gap: 10,
              alignItems: "center",
              background: "var(--accent-soft)",
              borderRadius: 6,
              padding: "11px 14px",
            }}
          >
            <Icon
              name="Sparkles"
              size={15}
              style={{ color: "var(--accent-ink)", flexShrink: 0 }}
            />
            <span
              style={{
                flex: 1,
                fontSize: 12.5,
                color: "var(--accent-ink)",
                lineHeight: 1.5,
              }}
            >
              That&apos;s your {cap}-profile trial limit —{" "}
              {notImported.length - sel.length} filed clients still waiting.{" "}
              {billingAdmin
                ? "Subscribe to bring in your full portfolio."
                : "Ask a Super Admin to subscribe for the full portfolio."}
            </span>
            {billingAdmin && (
              <Btn
                variant="primary"
                size="sm"
                disabled={
                  importing || importer.locked || !!error || sel.length > 0
                }
                onClick={() => navigate("/settings/billing")}
              >
                Review billing settings
              </Btn>
            )}
          </div>
        )}
        {capHit && plan === "paid" && notImported.length > sel.length && (
          <div style={{ marginTop: 12, fontSize: 12, color: "var(--ink-3)" }}>
            Profile cap reached ({cap}).{" "}
            {billingAdmin
              ? "Raise your tier from Settings › Billing."
              : "Contact a Super Admin to add more client profiles."}
          </div>
        )}
        {error && <ErrorText>{error}</ErrorText>}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            borderTop: "1px solid var(--border-1)",
            paddingTop: 14,
            marginTop: 14,
          }}
        >
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setError(null);
              setStageOverride("manual");
            }}
            style={{ fontSize: 12.5, fontWeight: 600, color: "var(--accent)" }}
          >
            + Add a client manually
          </a>
          <span style={{ flex: 1 }} />
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn
            variant="primary"
            disabled={sel.length === 0 || importing || importer.locked}
            onClick={() => void doImport()}
          >
            {importing
              ? "Importing…"
              : `Import ${sel.length > 0 ? sel.length + " " : ""}client${sel.length === 1 ? "" : "s"}`}
          </Btn>
        </div>
      </PendingFields>
    </Modal>
  );
}
