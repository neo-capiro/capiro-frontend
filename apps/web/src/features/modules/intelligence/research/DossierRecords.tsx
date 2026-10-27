"use client";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import { subjectType } from "../../../../shared/capiro/operations/defense-research-schemas";
import {
  ActionButton,
  Badge,
  DataTable,
  Panel,
  StatusPanel,
  TextInput,
} from "../../../../shared/module-ui";
import styles from "../intelligence.module.css";
import { EvidenceList, useResearchLocation } from "./ResearchNavigation";
export function DossierRecords() {
  const { params, update } = useResearchLocation();
  const type = subjectType.safeParse(params.get("researchSubject"));
  const selectedType = type.success ? type.data : "program_element";
  const id = params.get("researchId") || "";
  return (
    <div className={styles.stack}>
      <form
        key={`${selectedType}:${id}`}
        className={styles.toolbar}
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          update({
            researchSubject: String(data.get("type")),
            researchId: String(data.get("id") || "").trim(),
          });
        }}
      >
        <select
          name="type"
          className={styles.select}
          aria-label="Dossier subject type"
          defaultValue={selectedType}
        >
          {subjectType.options.map((value) => (
            <option key={value} value={value}>
              {value.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <TextInput
          name="id"
          aria-label="Dossier subject ID"
          required
          maxLength={300}
          defaultValue={id}
          placeholder="Canonical subject ID or PE code"
        />
        <ActionButton type="submit">Open dossier</ActionButton>
      </form>
      {id ? (
        <DossierDetail subjectType={selectedType} subjectId={id} />
      ) : (
        <Panel title="Dossiers & funding">
          <p className={styles.content}>
            Open a program, program element, project or budget line using its
            canonical ID. Funding values retain their source edition, fiscal
            year and measurement basis.
          </p>
        </Panel>
      )}
    </div>
  );
}
function DossierDetail({
  subjectType,
  subjectId,
}: {
  subjectType: "program" | "program_element" | "project" | "budget_line";
  subjectId: string;
}) {
  const query = useCapiroQuery("defenseResearch.dossier", {
    params: { subjectType, subjectId },
  });
  const funding = useCapiroQuery("defenseResearch.funding", {
    params: { subjectType, subjectId },
  });
  return (
    <>
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        {query.data && (
          <Panel
            title={query.data.subject.label}
            actions={
              <ActionButton onClick={query.reload}>
                Refresh dossier
              </ActionButton>
            }
          >
            <p className={styles.content}>
              <Badge>{query.data.coverage.state}</Badge>{" "}
              {query.data.coverage.availableFields} available /{" "}
              {query.data.coverage.expectedFields} expected fields ·{" "}
              {query.data.coverage.partialFields} partial
            </p>
            <DataTable
              rows={query.data.fields}
              rowKey={(row) => row.field}
              caption="Dossier fields"
              columns={[
                { key: "field", label: "Field", render: (row) => row.field },
                {
                  key: "value",
                  label: "Source-backed value",
                  render: (row) => (
                    <>
                      {row.value ?? "Not available"}
                      {row.reason && <p>{row.reason}</p>}
                    </>
                  ),
                },
                {
                  key: "state",
                  label: "Availability",
                  render: (row) => row.availability,
                },
                {
                  key: "evidence",
                  label: "Evidence",
                  render: (row) => <EvidenceList items={row.evidence} />,
                },
              ]}
            />
          </Panel>
        )}
      </StatusPanel>
      <StatusPanel
        loading={funding.loading}
        error={funding.error}
        onRetry={funding.reload}
      >
        {funding.data && (
          <Panel
            title="Funding matrix"
            actions={
              <ActionButton onClick={funding.reload}>
                Refresh funding
              </ActionButton>
            }
          >
            <div className={styles.content}>
              {funding.data.limitations.map((text) => (
                <p key={text}>{text}</p>
              ))}
            </div>
            <DataTable
              rows={funding.data.cells}
              rowKey={(row) =>
                `${row.sourceObservationId}:${row.basis.fundingFiscalYear}:${row.basis.metric}`
              }
              caption="Funding source cells"
              columns={[
                {
                  key: "basis",
                  label: "Edition / FY / stage",
                  render: (row) =>
                    `${row.basis.requestEdition || "Unknown edition"} · FY${row.basis.fundingFiscalYear} · ${row.basis.stage}`,
                },
                {
                  key: "value",
                  label: "Value / unit",
                  render: (row) =>
                    `${row.value ?? "Not available"} · ${row.basis.unit}`,
                },
                {
                  key: "status",
                  label: "Disposition",
                  render: (row) => row.disposition,
                },
                {
                  key: "evidence",
                  label: "Evidence",
                  render: (row) => <EvidenceList items={row.evidence} />,
                },
              ]}
            />
          </Panel>
        )}
      </StatusPanel>
    </>
  );
}
