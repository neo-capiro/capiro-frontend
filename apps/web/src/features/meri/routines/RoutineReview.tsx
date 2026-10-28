"use client";
import { useState, useSyncExternalStore } from "react";
import { Button } from "@capiro/ui/button";
import type { RoutineWorkflow } from "../../../shared/meri-routines/workflow";
import type { SavedRoutine } from "../../../shared/meri-routines/recovery";
import { Panel } from "../ui/Panel";
import styles from "../ui/meri-ui.module.css";

function Values({ value }: { value: unknown }) {
  if (value === null) return <>None</>;
  if (typeof value !== "object") return <>{String(value)}</>;
  if (Array.isArray(value))
    return value.length ? (
      <ul>
        {value.map((item, i) => (
          <li key={i}>
            <Values value={item} />
          </li>
        ))}
      </ul>
    ) : (
      <>None</>
    );
  return (
    <dl>
      {Object.entries(value).map(([name, item]) => (
        <div key={name}>
          <dt>{name.replace(/([a-z])([A-Z])/g, "$1 $2")}</dt>
          <dd>
            <Values value={item} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** The approved Work definition exactly as the contract states it. The review displays it verbatim: it never
 *  re-derives, defaults, summarises or reorders it, and an ordinary routine simply carries none. */
type WorkSelection = Readonly<{
  entry: string;
  jobKind: string;
  deliverables: readonly string[];
  dependencies: readonly string[];
}>;
function workSelection(proposal: unknown): WorkSelection | null {
  if (!proposal || typeof proposal !== "object") return null;
  const work = (proposal as { work?: unknown }).work;
  return work && typeof work === "object" ? (work as WorkSelection) : null;
}
/** The work the owner is approving: entry, kind, deliverables and dependencies, shown as reviewed. */
function WorkDefinition({ work }: { work: WorkSelection }) {
  const listed = (items: readonly string[]) =>
    items.length ? items.join("; ") : "none listed";
  return (
    <>
      <h3>Work this routine starts</h3>
      <p>
        Entry: {work.entry === "start-work" ? "Start work" : work.entry}. Kind:{" "}
        {work.jobKind}.
      </p>
      <p>Deliverables: {listed(work.deliverables)}.</p>
      <p>Dependencies: {listed(work.dependencies)}.</p>
    </>
  );
}

/** Full retained policy remains inspectable, including uncommon calendars and cancellation modes. */
export function RoutineProposalDetails({ saved }: { saved: SavedRoutine }) {
  const proposal = saved.proposal;
  const request = saved.prepare.request;
  const work = workSelection(proposal);
  return (
    <>
      <p>
        {saved.prepare.operation === "schedule_task"
          ? "Create routine"
          : saved.prepare.operation === "update_scheduled_task"
            ? "Update routine"
            : "Pause or cancel routine"}
      </p>
      {"taskInstruction" in request && (
        <>
          <h3>Instructions</h3>
          <p style={{ whiteSpace: "pre-wrap" }}>{request.taskInstruction}</p>
          <p>Requested destination: {request.destinationReference}</p>
          <p>
            Requested per run: $
            {(request.requestedLimits.maxCostMicrousd / 1_000_000).toFixed(6)}{" "}
            maximum, {request.requestedLimits.maxRuntimeSeconds} seconds,{" "}
            {request.requestedLimits.retryLimit} retries.
          </p>
        </>
      )}
      {proposal && (
        <>
          <p>
            Routine: {proposal.projection.scheduleId}. Resulting state:{" "}
            {proposal.projection.state}.
          </p>
          <p>
            Resolved destination: {proposal.projection.destinationId}. Timezone:{" "}
            {proposal.projection.timezone}.
          </p>
          <p>
            Effective per run: $
            {(proposal.projection.maxCostMicrousd / 1_000_000).toFixed(6)}{" "}
            maximum, {proposal.projection.maxRuntimeSeconds} seconds,{" "}
            {proposal.projection.retryLimit} retries.
          </p>
          <p>
            Scope:{" "}
            {proposal.projection.scopes
              .map((scope) => `${scope.kind}: ${scope.resourceId}`)
              .join("; ")}
            .
          </p>
        </>
      )}
      {work && <WorkDefinition work={work} />}
      <details>
        <summary>Review complete timing and behavior</summary>
        <Values value={"policy" in request ? request.policy : request} />
      </details>
      <p>
        Approval permits recurring reads within the shown scope. Future governed
        actions still require their own review.
      </p>
      {"running" in request && (
        <p>
          {request.running === "leave"
            ? "Existing running work is left running."
            : "This proposal requests cancellation of the listed running work."}{" "}
          A schedule acknowledgement does not prove physical cancellation of any
          running work.
        </p>
      )}
    </>
  );
}

/** The checkbox resets with exact proposal identity; only this explicit click approves a schedule. */
function Approval({
  port,
  saved,
  busy,
}: {
  port: RoutineWorkflow;
  saved: SavedRoutine;
  busy: boolean;
}) {
  const [reviewed, setReviewed] = useState(false);
  if (saved.result)
    return (
      <>
        <p role="status">
          The schedule owner acknowledged this change. This confirms the
          schedule definition, not completion of a scheduled run or physical
          cancellation of running work.
        </p>
        <Button disabled={busy} onClick={() => void port.finish()}>
          Finish review
        </Button>
      </>
    );
  if (saved.approving)
    return (
      <>
        <p role="status">
          This exact approval is saved. Its outcome is not yet confirmed.
          Checking observes the existing schedule intent; retrying sends the
          same approval.
        </p>
        <Button disabled={busy} onClick={() => void port.reconcile()}>
          Check schedule result
        </Button>{" "}
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => void port.approve()}
        >
          Retry exact approval
        </Button>
      </>
    );
  return (
    <>
      <label>
        <input
          type="checkbox"
          checked={reviewed}
          disabled={busy}
          onChange={(event) => setReviewed(event.target.checked)}
        />{" "}
        I reviewed the instructions, scope, timing, destination and limits
        {workSelection(saved.proposal) ? ", and the work this routine starts" : ""}.
      </label>
      <div className={styles.row}>
        <Button
          disabled={busy || !reviewed}
          onClick={() => {
            setReviewed(false);
            void port.approve();
          }}
        >
          Approve routine change
        </Button>
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => void port.discard()}
        >
          Discard unapproved preparation
        </Button>
      </div>
    </>
  );
}

export function RoutineReview({ port }: { port: RoutineWorkflow }) {
  const state = useSyncExternalStore(
    port.subscribe,
    port.getSnapshot,
    port.getSnapshot,
  );
  return (
    <section aria-label="Routine review">
      {!state.ready && <p role="status">Checking saved routine requests…</p>}
      {state.message && <p role="alert">{state.message}</p>}
      {!state.ready && !state.busy && (
        <Button onClick={() => void port.load()}>
          Retry saved request read
        </Button>
      )}
      {state.settled && (
        <p role="status">The routine change was acknowledged.</p>
      )}
      {state.saved && (
        <Panel label="Review routine change">
          <RoutineProposalDetails saved={state.saved} />
          {state.saved.proposal ? (
            <Approval
              key={
                state.saved.proposal.proposalId +
                state.saved.proposal.intentSha256
              }
              port={port}
              saved={state.saved}
              busy={state.busy}
            />
          ) : (
            <>
              <p role="status">
                Preparation is saved but its proposal has not been confirmed.
                Nothing is approved automatically.
              </p>
              <Button
                disabled={state.busy}
                onClick={() => void port.retryPrepare()}
              >
                Retry exact preparation
              </Button>{" "}
              <Button
                variant="outline"
                disabled={state.busy}
                onClick={() => void port.discard()}
              >
                Discard unapproved preparation
              </Button>
            </>
          )}
        </Panel>
      )}
    </section>
  );
}
