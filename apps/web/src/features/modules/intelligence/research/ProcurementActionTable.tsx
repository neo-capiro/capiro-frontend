import type {
  ProcurementActionDetail,
  ProcurementObservedActionDetail,
} from "@capiro/shared/defense-procurement";
import { Fragment, useState } from "react";
import { ActionButton, DataTable, Modal } from "../../../../shared/module-ui";
import { procurementUsd } from "./procurement-selection";
import { SourceLink } from "./ResearchEvidence";
import styles from "./procurement.module.css";

export function filterProcurementActions(
  actions: readonly (
    | ProcurementActionDetail
    | ProcurementObservedActionDetail
  )[],
  groups: readonly { fiscalYear: number | null; vendorKey: string }[],
) {
  const keys = new Set(
    groups.map((group) => JSON.stringify([group.fiscalYear, group.vendorKey])),
  );
  return actions.filter((action) =>
    keys.has(JSON.stringify([action.fiscalYear, action.vendorKey])),
  );
}

export function ProcurementActionTable({
  actions,
}: {
  actions: readonly (
    | ProcurementActionDetail
    | ProcurementObservedActionDetail
  )[];
}) {
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedAction =
    actions.find((action) => action.selectedRevisionId === selectedId) ?? null;
  const lastPage = Math.max(0, Math.ceil(actions.length / 20) - 1);
  const currentPage = Math.min(page, lastPage);
  return (
    <>
      <DataTable
        caption="Qualified actions with separate source funding and contracting organizations"
        scrollRegion
        rows={actions.slice(currentPage * 20, currentPage * 20 + 20)}
        rowKey={(row) => row.selectedRevisionId}
        columns={[
          {
            key: "identity",
            label: "Award / modification",
            render: (row) => (
              <>
                <div>
                  {row.piid} · Agency {row.submittingAgencyCode}
                </div>
                <div>
                  Modification {row.modificationNumber} · Transaction{" "}
                  {row.transactionNumber}
                </div>
                {row.parentPiid && (
                  <div>
                    Parent {row.parentPiid} · Agency {row.parentAgencyCode}
                  </div>
                )}
              </>
            ),
          },
          {
            key: "date",
            label: "Action date",
            render: (row) => (
              <>
                <time dateTime={row.actionDate ?? undefined}>
                  {row.actionDate ?? "Undated"}
                </time>
                <div>
                  {row.fiscalYear === null
                    ? "Fiscal year unknown"
                    : `FY${row.fiscalYear}`}
                </div>
                {"sourceRevisionLabel" in row && (
                  <span className={styles.subtext}>
                    Retrieved: {row.sourceObservedAt}
                  </span>
                )}
              </>
            ),
          },
          {
            key: "vendor",
            label: "Vendor",
            render: (row) => (
              <>
                <div>{row.contractorName ?? "Unreported name"}</div>
                <div>
                  {row.recipientUei
                    ? `Source UEI: ${row.recipientUei}`
                    : "Unresolved identity"}
                </div>
              </>
            ),
          },
          {
            key: "revision",
            label: "Publisher revision label",
            render: (row) =>
              "sourceRevisionLabel" in row ? (
                <span className={styles.subtext}>
                  {row.sourceRevisionLabel ?? "Not reported"}
                </span>
              ) : (
                <span className={styles.subtext}>
                  {row.sourceRevisionOrder ?? "Not reported"}
                </span>
              ),
          },
          {
            key: "obligation",
            label: "Signed obligations (USD)",
            render: (row) => (
              <span className={styles.actionAmount}>
                {procurementUsd(row.obligationUsd)}
              </span>
            ),
          },
          {
            key: "funding",
            label: "Funding organization",
            render: (row) => <Organization value={row.fundingOrganization} />,
          },
          {
            key: "contracting",
            label: "Contracting organization",
            render: (row) => (
              <Organization value={row.contractingOrganization} />
            ),
          },
          {
            key: "evidence",
            label: "Evidence",
            render: (row) => (
              <ActionButton
                aria-label={`Inspect action ${row.awardUniqueId}, modification ${row.modificationNumber}, transaction ${row.transactionNumber}`}
                onClick={() => setSelectedId(row.selectedRevisionId)}
              >
                Inspect action
              </ActionButton>
            ),
          },
        ]}
      />
      <nav className={styles.actions} aria-label="Qualified action pages">
        <ActionButton
          disabled={currentPage === 0}
          onClick={() => setPage(currentPage - 1)}
        >
          Previous actions
        </ActionButton>
        <span>
          Page {currentPage + 1} of {lastPage + 1} · {actions.length} qualified
          actions
        </span>
        <ActionButton
          disabled={currentPage === lastPage}
          onClick={() => setPage(currentPage + 1)}
        >
          Next actions
        </ActionButton>
      </nav>
      <Modal
        open={selectedAction !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
        className={styles.exportDialog}
        title="Qualified action evidence"
        description="Recorded identifiers and source clocks for one qualified action, not an additional spending total."
        footer={
          <ActionButton onClick={() => setSelectedId(null)}>
            Close evidence
          </ActionButton>
        }
      >
        {selectedAction && <ActionEvidence action={selectedAction} />}
      </Modal>
    </>
  );
}

function Organization({
  value,
}: {
  value: ProcurementActionDetail["fundingOrganization"];
}) {
  return (
    <>
      {(["department", "subtier", "office"] as const).map((level) => (
        <div key={level}>
          {level === "subtier"
            ? "Subtier"
            : level === "department"
              ? "Department"
              : "Office"}
          : {value[level].code ?? "Unknown code"} ·{" "}
          {value[level].name ?? "Unknown name"}
        </div>
      ))}
    </>
  );
}

function ActionEvidence({
  action,
}: {
  action: ProcurementActionDetail | ProcurementObservedActionDetail;
}) {
  const isObservedAction = "sourceRevisionLabel" in action;
  const fields: readonly [string, string | null][] = [
    ["Award identity", action.awardIdentityKey],
    ["Action identity", action.transactionIdentityKey],
    ["Selected revision", action.selectedRevisionId],
    ["PIID", action.piid],
    ["Submitting agency", action.submittingAgencyCode],
    ["Parent PIID", action.parentPiid],
    ["Parent agency", action.parentAgencyCode],
    ["Modification", action.modificationNumber],
    ["Transaction", action.transactionNumber],
    ["Signed obligation (USD, source value)", action.obligationUsd],
    ["Action outlay", null],
    isObservedAction
      ? ["Publisher revision label (verbatim)", action.sourceRevisionLabel]
      : ["Source revision (UTC)", action.sourceRevisionOrder],
    ["Observed (UTC)", action.sourceObservedAt],
    ["Recorded (UTC)", action.recordedAt],
    ["Source payload SHA-256", action.sourcePayloadHash],
  ];
  return (
    <div className={styles.evidence}>
      <dl>
        {fields.map(([label, value]) => (
          <Fragment key={label}>
            <dt>{label}</dt>
            <dd>{value ?? "Not reported"}</dd>
          </Fragment>
        ))}
      </dl>
      <h3>Funding organization</h3>
      <Organization value={action.fundingOrganization} />
      <h3>Contracting organization</h3>
      <Organization value={action.contractingOrganization} />
      <p>
        The recorded URL may identify a search rather than one modification and
        may require source-system access. Use the full identity and payload hash
        above.
      </p>
      {action.sourceUrl ? (
        <SourceLink url={action.sourceUrl}>Recorded source search</SourceLink>
      ) : (
        <p>No source URL reported.</p>
      )}
    </div>
  );
}
