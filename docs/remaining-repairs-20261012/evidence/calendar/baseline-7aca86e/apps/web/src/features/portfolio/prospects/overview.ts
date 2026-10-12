import {
  isPortfolioStage,
  portfolioStages,
  stageLabel,
  type ProspectActivity,
  type StageCatalog,
} from "./contracts";

export function prospectHistoryRows(rows: ProspectActivity[], kind = "") {
  return rows
    .filter((row) => !kind || row.kind === kind)
    .toSorted(
      (a, b) =>
        Date.parse(b.createdAt) - Date.parse(a.createdAt) ||
        a.id.localeCompare(b.id),
    );
}

/** Pipeline position is a presentation of the current stage, not visited-stage history. */
export function prospectStageProgress(
  stage: string,
  catalog?: StageCatalog | null,
) {
  if (!catalog || !isPortfolioStage(stage)) return [];
  const openStages = catalog.stages.filter(
    (item) => item.value !== "closed_won" && item.value !== "closed_lost",
  );
  const ordered = portfolioStages.flatMap((value) => {
    const item = openStages.find((stage) => stage.value === value);
    return item ? [item] : [];
  });
  const closed = stage === "closed_won" || stage === "closed_lost";
  const current = closed
    ? ordered.length
    : ordered.findIndex((item) => item.value === stage);
  return [
    ...ordered,
    { value: "closed", label: closed ? stageLabel(stage) : "Closed" },
  ].map((item, index) => ({
    ...item,
    position:
      index === current
        ? ("current" as const)
        : index < current
          ? ("earlier" as const)
          : ("later" as const),
  }));
}
