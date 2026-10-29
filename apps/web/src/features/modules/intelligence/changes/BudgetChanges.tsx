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
import {
  useResearchLocation,
  ResearchPages,
} from "../research/ResearchNavigation";
import styles from "../intelligence.module.css";
export function BudgetChanges() {
  const { params, update } = useResearchLocation();
  const peCode = params.get("changesBudgetPe") || "",
    year = params.get("changesFy") || "";
  const fy = year ? Number(year) : undefined;
  const minScore = Number(params.get("changesScore") || "0.4");
  const rawPage = Number(params.get("changesBudgetPage") || 1);
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const valid =
    peCode.length <= 16 &&
    (fy === undefined || (Number.isInteger(fy) && fy >= 2000 && fy <= 2100)) &&
    Number.isFinite(minScore) &&
    minScore >= 0 &&
    minScore <= 1;
  const attention = useCapiroQuery(
    "defenseChanges.attention",
    { query: { fy, minScore, limit: 100 } },
    { enabled: valid && !peCode },
  );
  const specific = useCapiroQuery(
    "defenseChanges.budget",
    { params: { peCode }, query: { fy, page, limit: 25 } },
    { enabled: valid && !!peCode },
  );
  const query = peCode ? specific : attention;
  const mismatch =
    peCode && specific.data?.data.some((row) => row.peCode !== peCode);
  return (
    <Panel
      title="Budget changes"
      description="Current budget deltas. Fiscal year is the asserted budget year; source references identify the compared records."
    >
      <form
        key={`${peCode}:${year}:${minScore}`}
        className={styles.toolbar}
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          update({
            changesBudgetPe: String(data.get("pe") || "").trim(),
            changesFy: String(data.get("fy") || ""),
            changesScore: String(data.get("score") || "0.4"),
            changesBudgetPage: null,
          });
        }}
      >
        <Field label="Budget program element" htmlFor="changes-budget-pe">
          <TextInput
            id="changes-budget-pe"
            name="pe"
            defaultValue={peCode}
            maxLength={16}
            placeholder="All program elements"
          />
        </Field>
        <Field label="Budget fiscal year" htmlFor="changes-budget-fy">
          <TextInput
            id="changes-budget-fy"
            name="fy"
            type="number"
            min={2000}
            max={2100}
            defaultValue={year}
            placeholder="All fiscal years"
          />
        </Field>
        <Field
          label="Minimum materiality (all programs)"
          htmlFor="changes-budget-score"
        >
          <TextInput
            id="changes-budget-score"
            name="score"
            type="number"
            min={0}
            max={1}
            step="0.1"
            defaultValue={params.get("changesScore") || "0.4"}
          />
        </Field>
        <ActionButton type="submit">Apply budget filters</ActionButton>
        <ActionButton type="button" onClick={query.reload}>
          Refresh budget
        </ActionButton>
      </form>
      <StatusPanel
        loading={query.loading}
        error={
          !valid
            ? "Choose a valid program code, fiscal year and materiality value."
            : mismatch
              ? "Budget results do not match the selected program element."
              : query.error
        }
        onRetry={query.reload}
      >
        {valid && !mismatch && (
          <>
            <p className={styles.content}>
              {peCode
                ? "Program-specific results; the all-program materiality threshold does not apply."
                : "Up to 100 current changes, ranked with tenant relevance. This is a bounded feed, not the full change population."}{" "}
              Amount units are not supplied by this feed; verify the source
              basis before comparing amounts.
            </p>
            <DataTable
              rows={query.data?.data || []}
              rowKey={(r) => r.id}
              caption="Budget change records"
              columns={[
                {
                  key: "program",
                  label: "Program / year",
                  render: (r) => `${r.peCode} · FY${r.assertedFy}`,
                },
                {
                  key: "type",
                  label: "Change",
                  render: (r) => (
                    <>
                      {r.deltaType}
                      <p>{r.explanation || "No source explanation supplied"}</p>
                    </>
                  ),
                },
                {
                  key: "amount",
                  label: "Stored amounts",
                  render: (r) =>
                    `${r.amountFrom ?? "Unavailable"} → ${r.amountTo ?? "Unavailable"}`,
                },
                {
                  key: "source",
                  label: "Source references",
                  render: (r) =>
                    `${r.fromRef ?? "Not supplied"} → ${r.toRef ?? "Not supplied"}`,
                },
                {
                  key: "score",
                  label: "Materiality / computed",
                  render: (r) => `${r.materialityScore} · ${r.computedAt}`,
                },
              ]}
            />
            {specific.data && peCode && (
              <ResearchPages
                page={page}
                total={specific.data.total}
                limit={specific.data.limit}
                onPage={(next) => update({ changesBudgetPage: String(next) })}
              />
            )}
          </>
        )}
      </StatusPanel>
    </Panel>
  );
}
