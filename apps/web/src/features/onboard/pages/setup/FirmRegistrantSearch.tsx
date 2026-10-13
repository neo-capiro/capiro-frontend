import { AttemptStatus } from "../../ui/AttemptStatus";
import { ImportOutcome } from "../../ui/ImportOutcome";
import { Btn, Icon, Modal, Spinner, TextInput } from "../../ui/primitives";
import { ErrorText } from "../funnel/shared";
import type { ImportWorkflow } from "./useImportWorkflow";
type Props = Pick<
  ImportWorkflow,
  | "importer"
  | "firm"
  | "setStageOverride"
  | "q"
  | "setQ"
  | "submittedQ"
  | "setSubmittedQ"
  | "settingFirm"
  | "error"
  | "setError"
  | "setMName"
  | "search"
  | "chooseFirm"
  | "refreshCurrent"
> & { onClose: () => void };
export function FirmRegistrantSearch({
  importer,
  firm,
  setStageOverride,
  q,
  setQ,
  submittedQ,
  setSubmittedQ,
  settingFirm,
  error,
  setError,
  setMName,
  search,
  chooseFirm,
  refreshCurrent,
  onClose,
}: Props) {
  return (
    <Modal title="Find your firm in LDA filings" onClose={onClose} width={620}>
      <AttemptStatus
        record={importer.record}
        check={() => void refreshCurrent()}
      />
      <ImportOutcome evidence={importer.evidence} />
      <p
        style={{
          margin: "-2px 0 14px",
          fontSize: 13,
          color: "var(--ink-2)",
          lineHeight: 1.6,
          textWrap: "pretty",
        }}
      >
        Your firm files lobbying disclosures (LDA) under a registrant. Find it
        below to pull in your actual filed clients — each lands with its federal
        data pre-linked, no name-guessing.
      </p>
      <div style={{ display: "flex", gap: 0 }}>
        <TextInput
          placeholder="Search your firm's name (e.g. Meridian Strategies)"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setSubmittedQ("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && q.trim()) setSubmittedQ(q.trim());
          }}
          style={{
            borderTopRightRadius: 0,
            borderBottomRightRadius: 0,
            background: "#fff",
          }}
        />
        <button
          onClick={() => q.trim() && setSubmittedQ(q.trim())}
          style={{
            width: 46,
            border: "none",
            borderRadius: "0 6px 6px 0",
            background: "var(--bg-dark)",
            color: "#fff",
            cursor: "pointer",
            display: "grid",
            placeItems: "center",
          }}
        >
          <Icon name="Search" size={15} />
        </button>
      </div>
      {search.isFetching && (
        <div
          style={{
            marginTop: 12,
            display: "flex",
            alignItems: "center",
            gap: 9,
            fontSize: 12.5,
            color: "var(--ink-2)",
          }}
        >
          <Spinner />
          Searching LDA registrants…
        </div>
      )}
      <AttemptStatus record={firm.record} check={() => void refreshCurrent()} />
      {search.error && (
        <ErrorText>
          Current search results are unavailable.{" "}
          <Btn onClick={() => void search.refetch()}>Retry search</Btn>
        </ErrorText>
      )}
      {search.isSuccess && !search.error && search.data.length === 0 && (
        <div
          style={{
            marginTop: 12,
            fontSize: 12.5,
            color: "var(--ink-3)",
            lineHeight: 1.55,
          }}
        >
          No registrants matched “{submittedQ}”. Check the spelling, or{" "}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setError(null);
              setMName(q.trim());
              setStageOverride("manual");
            }}
            style={{ color: "var(--accent)", fontWeight: 600 }}
          >
            add your clients manually
          </a>
          .
        </div>
      )}
      {search.isSuccess && !search.error && search.data.length > 0 && (
        <div
          style={{
            marginTop: 12,
            display: "grid",
            gap: 8,
            maxHeight: 340,
            overflowY: "auto",
          }}
        >
          {search.data.map((hit) => (
            <div
              key={hit.id}
              role="button"
              tabIndex={settingFirm || firm.locked ? -1 : 0}
              aria-disabled={settingFirm || firm.locked}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  void chooseFirm(hit.id);
                }
              }}
              onClick={() => void chooseFirm(hit.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                border: "1px solid var(--border-1)",
                borderRadius: 8,
                padding: "12px 14px",
                cursor: settingFirm ? "default" : "pointer",
                opacity: settingFirm ? 0.6 : 1,
                background: "var(--bg-surface-2)",
              }}
            >
              <Icon
                name="Landmark"
                size={16}
                style={{ color: "var(--ink-3)" }}
              />
              <div style={{ flex: 1 }}>
                <b style={{ fontSize: 13 }}>{hit.name}</b>
                <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
                  {[hit.city, hit.state].filter(Boolean).join(", ")}
                  {[hit.city, hit.state].filter(Boolean).length > 0
                    ? " · "
                    : ""}
                  {hit.totalClients} filed clients
                </div>
              </div>
              <Icon
                name="ChevronRight"
                size={15}
                style={{ color: "var(--ink-3)" }}
              />
            </div>
          ))}
        </div>
      )}
      {error && <ErrorText>{error}</ErrorText>}
      <div style={{ display: "flex", alignItems: "center", marginTop: 16 }}>
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setError(null);
            setStageOverride("manual");
          }}
          style={{ fontSize: 12.5, fontWeight: 600, color: "var(--accent)" }}
        >
          Can&apos;t find your firm? Add clients manually
        </a>
        <span style={{ flex: 1 }} />
        <Btn onClick={onClose}>Cancel</Btn>
      </div>
    </Modal>
  );
}
