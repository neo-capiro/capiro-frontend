import { AttemptStatus, PendingFields } from "../../ui/AttemptStatus";
import { Btn, Icon, Modal, TextInput } from "../../ui/primitives";
import { ErrorText } from "../funnel/shared";
import type { ImportWorkflow } from "./useImportWorkflow";
type Props = Pick<
  ImportWorkflow,
  | "manual"
  | "setStageOverride"
  | "error"
  | "setError"
  | "mName"
  | "setMName"
  | "mWebsite"
  | "setMWebsite"
  | "mDesc"
  | "setMDesc"
  | "manualBusy"
  | "manualAdded"
  | "refreshCurrent"
  | "remainingAfterManual"
  | "doManualAdd"
> & { cap: number; onClose: () => void };
export function ManualClientForm({
  manual,
  setStageOverride,
  error,
  setError,
  mName,
  setMName,
  mWebsite,
  setMWebsite,
  mDesc,
  setMDesc,
  manualBusy,
  manualAdded,
  refreshCurrent,
  remainingAfterManual,
  doManualAdd,
  cap,
  onClose,
}: Props) {
  return (
    <Modal title="Add a client manually" onClose={onClose} width={560}>
      <AttemptStatus
        record={manual.record}
        check={() => void refreshCurrent()}
      />
      <PendingFields disabled={manual.locked}>
        <p
          style={{
            margin: "-2px 0 14px",
            fontSize: 13,
            color: "var(--ink-2)",
            lineHeight: 1.6,
            textWrap: "pretty",
          }}
        >
          Add clients that aren&apos;t in your LDA filings. Just the name is
          required to get started — you&apos;ll{" "}
          <b>finish setting up each client in your Portfolio</b> (issues,
          contacts, federal links, and more). Richer profiles give Meri the
          context it needs for the best results.
        </p>
        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <label
              style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-2)" }}
            >
              Client name <span style={{ color: "var(--critical)" }}>*</span>
            </label>
            <TextInput
              placeholder="e.g. Overland AI"
              value={mName}
              onChange={(e) => setMName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void doManualAdd();
              }}
              style={{ background: "#fff", marginTop: 4 }}
            />
          </div>
          <div>
            <label
              style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-2)" }}
            >
              Website{" "}
              <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>
                (optional)
              </span>
            </label>
            <TextInput
              placeholder="acme.com"
              value={mWebsite}
              onChange={(e) => setMWebsite(e.target.value)}
              style={{ background: "#fff", marginTop: 4 }}
            />
          </div>
          <div>
            <label
              style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-2)" }}
            >
              Short description{" "}
              <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>
                (optional)
              </span>
            </label>
            <TextInput
              placeholder="What they do / what you work on for them"
              value={mDesc}
              onChange={(e) => setMDesc(e.target.value)}
              style={{ background: "#fff", marginTop: 4 }}
            />
          </div>
        </div>
        {manualAdded > 0 && (
          <div
            style={{
              marginTop: 12,
              display: "flex",
              alignItems: "center",
              gap: 7,
              fontSize: 12.5,
              color: "var(--success)",
              fontWeight: 600,
            }}
          >
            <Icon name="CircleCheck" size={15} />
            {manualAdded} client{manualAdded === 1 ? "" : "s"} added ·{" "}
            {remainingAfterManual} of {cap} profiles remaining
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
            marginTop: 16,
          }}
        >
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setError(null);
              setStageOverride("search");
            }}
            style={{
              fontSize: 12.5,
              fontWeight: 600,
              color: "var(--accent)",
            }}
          >
            ← Search LDA filings instead
          </a>
          <span style={{ flex: 1 }} />
          <Btn onClick={onClose}>Done</Btn>
          <Btn
            variant="primary"
            disabled={!mName.trim() || manualBusy || remainingAfterManual <= 0}
            onClick={() => void doManualAdd()}
          >
            {manualBusy ? "Adding…" : "Add client"}
          </Btn>
        </div>
      </PendingFields>
    </Modal>
  );
}
