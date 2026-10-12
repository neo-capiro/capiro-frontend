"use client";
import { TimelineGrid, timelineRows } from "./StrategyTimelineGrid";

import { useState } from "react";
import type {
  StrategyDetail,
  StrategyNode,
} from "../../../shared/capiro/operations/strategies-schemas";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  Modal,
  Panel,
  SelectInput,
  StatusPanel,
  TextArea,
  UnavailableAction,
} from "../../../shared/module-ui";
import { FirmPhases } from "./FirmPhases";
import styles from "./strategies.module.css";
import { fiscalYear, objectiveLabels } from "./strategy-model";
import { StrategyCalendar } from "./StrategyCalendar";
import { StrategyExport } from "./StrategyExport";
import { StrategyHistory } from "./StrategyHistory";
import { StrategyStep } from "./StrategyStep";

function TimelineView({
  strategy,
  onClose,
  reload,
}: {
  strategy: StrategyDetail;
  onClose: () => void;
  reload: () => void;
}) {
  const [years, setYears] = useState(3);
  const [startFy, setStartFy] = useState(() =>
    strategy.nodes.length
      ? fiscalYear(new Date(strategy.nodes[0]!.startsOn))
      : fiscalYear(new Date()),
  );
  const [flags, setFlags] = useState({ ppbe: true, congress: true });
  const [step, setStep] = useState<true | StrategyNode>();
  const [phasesOpen, setPhasesOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [history, setHistory] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [assistant, setAssistant] = useState(false);
  const [health, setHealth] = useState(false);
  const phases = useCapiroQuery("strategies.phases", {});
  const references = useCapiroQuery("strategies.calendars", {});
  const clients = useCapiroQuery("clients.list", {});
  const rows = timelineRows(
    strategy,
    phases.data ?? [],
    references.data?.congress ?? [],
    references.data?.ppbeLanes ?? [],
    flags,
  );
  const assigned = strategy.nodes.filter((node) => node.ownerUserId).length;
  return (
    <section className={styles.screen} data-design-node="411:119740">
      <div>
        <ActionButton onClick={onClose}>← Back to Strategies</ActionButton>
      </div>
      <div className={styles.scope}>
        <div>
          <Badge>
            {clients.data?.find((client) => client.id === strategy.clientId)
              ?.name ?? "Client"}
          </Badge>
          <SelectInput
            aria-label="Fiscal horizon"
            value={String(years)}
            onValueChange={(value) => setYears(Number(value))}
            options={[1, 2, 3].map((value) => ({
              value: String(value),
              label: `FY${startFy}${value > 1 ? `–FY${startFy + value - 1}` : ""}`,
            }))}
          />
          <SelectInput
            aria-label="Fiscal start year"
            value={String(startFy)}
            onValueChange={(value) => setStartFy(Number(value))}
            options={Array.from({ length: 11 }, (_, index) => ({
              value: String(fiscalYear(new Date()) - 3 + index),
              label: `Start FY${fiscalYear(new Date()) - 3 + index}`,
            }))}
          />
        </div>
        <span className={styles.muted}>
          Saved {new Date(strategy.lastEditedAt).toLocaleString()}
        </span>
      </div>
      <header className={styles.heading}>
        <div>
          <h1>{strategy.title}</h1>
          <p>Goal · {strategy.goal ?? "No goal supplied"}</p>
        </div>
        <div className={styles.actions}>
          <ActionButton onClick={() => setExporting(true)}>Export</ActionButton>
          <ActionButton onClick={() => setHistory(true)}>History</ActionButton>
          <ActionButton onClick={() => setAssistant(true)}>
            Ask Meri
          </ActionButton>
        </div>
      </header>
      <div className={styles.scope}>
        <Badge>{objectiveLabels[strategy.type]}</Badge>
        <div className={styles.pills}>
          <button
            aria-pressed={flags.ppbe}
            className={flags.ppbe ? styles.active : ""}
            onClick={() =>
              setFlags((previous) => ({ ...previous, ppbe: !previous.ppbe }))
            }
          >
            PPBE
          </button>
          <button
            aria-pressed={flags.congress}
            className={flags.congress ? styles.active : ""}
            onClick={() =>
              setFlags((previous) => ({
                ...previous,
                congress: !previous.congress,
              }))
            }
          >
            Congress
          </button>
        </div>
      </div>
      <div className={styles.timelineTools}>
        <div>
          <h2>
            Working timeline
            <span>
              {strategy.nodes.length} steps ·{" "}
              {rows.filter((row) => row.group).length} reference layers
            </span>
          </h2>
        </div>
        <div className={styles.actions}>
          <ActionButton onClick={() => setHealth(true)}>
            Plan health
          </ActionButton>
          <ActionButton onClick={() => setPhasesOpen(true)}>
            Firm phases
          </ActionButton>
          <ActionButton onClick={() => setStep(true)}>Add step</ActionButton>
        </div>
      </div>
      {(phases.error || references.error) && (
        <p role="alert" className={styles.notice}>
          {(phases.error ?? references.error)?.message} · Available strategy
          steps remain visible.
        </p>
      )}
      <TimelineGrid
        rows={rows}
        startFy={startFy}
        years={years}
        onNode={setStep}
        onCalendar={() => setCalendarOpen(true)}
      />
      {!strategy.nodes.length && (
        <Panel
          title="Build your working plan"
          description="Add the first step to turn this goal into a timeline."
        >
          <ActionButton primary onClick={() => setStep(true)}>
            Add step
          </ActionButton>
        </Panel>
      )}
      {step && (
        <StrategyStep
          strategy={strategy}
          node={step === true ? undefined : step}
          onClose={() => setStep(undefined)}
          onSaved={reload}
        />
      )}
      {phasesOpen && (
        <FirmPhases
          phases={phases.data ?? []}
          onClose={() => setPhasesOpen(false)}
          onSaved={phases.reload}
        />
      )}
      {calendarOpen && (
        <StrategyCalendar
          rows={references.data?.congress ?? []}
          onClose={() => setCalendarOpen(false)}
          onSaved={references.reload}
        />
      )}
      {history && (
        <StrategyHistory
          id={strategy.id}
          onClose={() => setHistory(false)}
          onRestored={reload}
        />
      )}
      {exporting && (
        <StrategyExport
          strategy={strategy}
          onClose={() => setExporting(false)}
        />
      )}
      <Modal
        open={assistant}
        side="right"
        onOpenChange={setAssistant}
        title="Strategy assistant"
        description={strategy.title}
      >
        <div className={styles.form}>
          <TextArea
            aria-label="Ask Meri about this strategy"
            placeholder="Ask about this strategy…"
          />
          <UnavailableAction reason="Greenfield Meri’s strategy assistant is being rebuilt independently.">
            Send
          </UnavailableAction>
        </div>
      </Modal>
      <Modal
        open={health}
        onOpenChange={setHealth}
        title="Plan health"
        description="Local completeness checks for the displayed working plan."
      >
        <div className={styles.form}>
          <p>
            {assigned} of {strategy.nodes.length} steps have an owner.
          </p>
          <p>
            {
              strategy.nodes.filter((node) => node.status === "completed")
                .length
            }{" "}
            completed steps
          </p>
          <p>
            {
              strategy.nodes.filter((node) =>
                ["draft", "internal_review", "suggested"].includes(
                  node.status ?? "draft",
                ),
              ).length
            }{" "}
            steps need review.
          </p>
          <p className={styles.muted}>
            Source health and material conflicts are reviewed in Context
            library.
          </p>
        </div>
      </Modal>
    </section>
  );
}

export function StrategyTimeline({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const query = useCapiroQuery("strategies.detail", { params: { id } });
  return (
    <StatusPanel
      loading={query.loading}
      error={query.error}
      onRetry={query.reload}
    >
      {query.data && (
        <TimelineView
          key={query.data.id}
          strategy={query.data}
          onClose={onClose}
          reload={query.reload}
        />
      )}
    </StatusPanel>
  );
}
