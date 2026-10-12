"use client";

import { useMemo, useState } from "react";
import { Button } from "@capiro/ui/button";
import { MeriRunWorkspace } from "../workspace/MeriRunWorkspace";
import {
  buildWorkspaceView,
  listRunAttempts,
  runStateLabels,
} from "../workspace/workspace-view";
import { projectSampleEvents, runActivityEvents } from "./run-activity-events";
import styles from "../workspace/workspace.module.css";

export function RunActivityFixture() {
  const [scenario, setScenario] = useState("activity"),
    [limit, setLimit] = useState(4),
    [selectionKey, setSelectionKey] = useState(""),
    [draft, setDraft] = useState("");
  const [replayOutcome, setReplayOutcome] = useState("");
  const events = useMemo(() => runActivityEvents(scenario), [scenario]);
  const projection = useMemo(
    () => projectSampleEvents(events.slice(0, limit)),
    [events, limit],
  );
  const selections = listRunAttempts(projection.accepted);
  const selection = selections.find(
    (item) => JSON.stringify([item.runId, item.attemptId]) === selectionKey,
  ) ??
    selections[0] ?? {
      runId: "10000000-0000-4000-8000-000000000010",
      attemptId: "10000000-0000-4000-8000-000000000020",
    };
  const view = buildWorkspaceView(projection.accepted, selection);
  const chooseScenario = (value: string) => {
    setScenario(value);
    setLimit(value === "activity" ? 4 : Infinity);
    setSelectionKey("");
    setReplayOutcome("");
  };
  const replay = () => {
    const last = projection.accepted.at(-1);
    if (last)
      setReplayOutcome(`Sample replay: ${projection.accept(last).status}`);
  };
  return (
    <>
      <section
        className={styles.fixture}
        aria-label="Disconnected sample event controls"
      >
        <div className={styles.fixtureControls}>
          <div className={styles.fixtureField}>
            <label htmlFor="sample-scenario">Sample scenario</label>
            <select
              id="sample-scenario"
              value={scenario}
              onChange={(event) => chooseScenario(event.currentTarget.value)}
            >
              <option value="activity">Reference activity</option>
              <option value="isolation">Run and attempt isolation</option>
              {Object.entries(runStateLabels).map(([state, label]) => (
                <option value={state} key={state}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.fixtureField}>
            <label htmlFor="sample-run-attempt">Sample run and attempt</label>
            <select
              id="sample-run-attempt"
              value={JSON.stringify([selection.runId, selection.attemptId])}
              onChange={(event) => setSelectionKey(event.currentTarget.value)}
            >
              {selections.map((item) => (
                <option
                  key={JSON.stringify([item.runId, item.attemptId])}
                  value={JSON.stringify([item.runId, item.attemptId])}
                >
                  {item.runId} · {item.attemptId}
                </option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            className={styles.button}
            onClick={() =>
              setLimit((value) => Math.min(events.length, value + 1))
            }
            disabled={limit >= events.length}
          >
            Apply next sample event
          </Button>
          <Button
            type="button"
            className={styles.button}
            onClick={() => setLimit(events.length)}
            disabled={limit >= events.length}
          >
            Show all sample events
          </Button>
          <Button
            type="button"
            className={styles.button}
            onClick={replay}
            disabled={!projection.accepted.length}
          >
            Replay last sample event
          </Button>
        </div>
        <p className={styles.fixtureOutcome} role="status">
          {replayOutcome ||
            `${projection.accepted.length} sample events displayed. Fixture changes are local only.`}
        </p>
      </section>
      <MeriRunWorkspace view={view} draft={draft} onDraft={setDraft} />
    </>
  );
}
