"use client";

import { useState } from "react";
import { SelectInput } from "../../../shared/module-ui";
import { fiscalYear } from "./strategy-model";
import {
  TimelineGrid,
  strategyStepRows,
  type TimelineNode,
} from "./StrategyTimelineGrid";
import styles from "./strategies.module.css";

/** Read-only roadmap over the supplied saved nodes; it never loads a mutable Strategy. */
export function StrategyRoadmap({ nodes }: { nodes: readonly TimelineNode[] }) {
  const fiscalYears = [
    ...new Set(
      nodes.flatMap((node) => [
        fiscalYear(new Date(node.startsOn)),
        fiscalYear(new Date(node.endsOn ?? node.startsOn)),
      ]),
    ),
  ].sort((left, right) => left - right);
  const [startFy, setStartFy] = useState(fiscalYears[0] ?? 0);
  const [years, setYears] = useState(3);
  if (!nodes.length) return <p>No saved steps.</p>;
  const firstFy = fiscalYears[0]!;
  const lastFy = fiscalYears.at(-1)!;
  return (
    <section aria-label="Generated strategy roadmap">
      <div className={styles.timelineTools}>
        <h3>
          Generated strategy roadmap <span>{nodes.length} saved steps</span>
        </h3>
        <div className={styles.actions}>
          <SelectInput
            aria-label="Saved roadmap fiscal start year"
            value={String(startFy)}
            onValueChange={(value) => setStartFy(Number(value))}
            options={Array.from(
              { length: lastFy - firstFy + 1 },
              (_, index) => ({
                value: String(firstFy + index),
                label: `Start FY${firstFy + index}`,
              }),
            )}
          />
          <SelectInput
            aria-label="Saved roadmap fiscal horizon"
            value={String(years)}
            onValueChange={(value) => setYears(Number(value))}
            options={[1, 2, 3].map((value) => ({
              value: String(value),
              label: `${value} fiscal ${value === 1 ? "year" : "years"}`,
            }))}
          />
        </div>
      </div>
      <TimelineGrid
        rows={strategyStepRows(nodes)}
        startFy={startFy}
        years={years}
      />
    </section>
  );
}
