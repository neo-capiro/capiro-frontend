"use client";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import {
  ActionButton,
  DataTable,
  Field,
  Panel,
  StatusPanel,
  TextInput,
} from "../../../../shared/module-ui";
import { useResearchLocation } from "../research/ResearchNavigation";
import { ProgramBills } from "../ProgramEvidence";
import { FederalEvidenceTimeline } from "./FederalEvidenceTimeline";
import styles from "../intelligence.module.css";
export function CongressionalChanges() {
  const { params, update } = useResearchLocation();
  const peCode = params.get("changesCongressPe") || "";
  const valid = peCode.length > 0 && peCode.length <= 16;
  const query = useCapiroQuery(
    "defenseChanges.congressional",
    { params: { peCode } },
    { enabled: valid },
  );
  return (
    <div className={styles.stack}>
      <Panel
        title="Congressional changes"
        description="Action history for bills linked to one program element. Action dates and Congress are distinct from a budget fiscal year."
      >
        <form
          key={peCode}
          className={styles.toolbar}
          onSubmit={(e) => {
            e.preventDefault();
            update({
              changesCongressPe: String(
                new FormData(e.currentTarget).get("pe") || "",
              ).trim(),
              changesEvidenceCursor: null,
            });
          }}
        >
          <Field
            label="Congressional program element"
            htmlFor="changes-congress-pe"
          >
            <TextInput
              id="changes-congress-pe"
              name="pe"
              required
              maxLength={16}
              defaultValue={peCode}
            />
          </Field>
          <ActionButton type="submit">Open bill actions</ActionButton>
          <ActionButton type="button" disabled={!valid} onClick={query.reload}>
            Refresh bill actions
          </ActionButton>
        </form>
        {!peCode ? (
          <p className={styles.content}>
            Choose a program element to see its congressional action history.
          </p>
        ) : (
          <StatusPanel
            loading={query.loading}
            error={
              !valid ? "Choose a valid program element code." : query.error
            }
            onRetry={query.reload}
          >
            {valid && (
              <>
                <p className={styles.content}>
                  Up to 200 actions from at most 40 bills and 60 actions per
                  bill. This source does not provide a fiscal-year filter.
                </p>
                <DataTable
                  rows={
                    query.data?.data.map((row, index) => ({
                      ...row,
                      key: `${row.billId}:${index}`,
                    })) || []
                  }
                  rowKey={(r) => r.key}
                  caption="Congressional action history"
                  columns={[
                    {
                      key: "bill",
                      label: "Bill / Congress",
                      render: (r) =>
                        `${r.billType.toUpperCase()} ${r.billNumber} · Congress ${r.congress} · ${r.billTitle}`,
                    },
                    {
                      key: "date",
                      label: "Action date",
                      render: (r) => r.date,
                    },
                    {
                      key: "text",
                      label: "Recorded action",
                      render: (r) => r.text,
                    },
                    {
                      key: "stage",
                      label: "Stage / chamber",
                      render: (r) =>
                        `${r.stageLabel} · ${r.chamber || "Not supplied"}`,
                    },
                  ]}
                />
              </>
            )}
          </StatusPanel>
        )}
      </Panel>
      {valid && <ProgramBills peCode={peCode} />}
      {valid && <FederalEvidenceTimeline key={peCode} peCode={peCode} />}
    </div>
  );
}
