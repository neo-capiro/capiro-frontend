"use client";
import { useCallback } from "react";
import type {
  ConversationUsageResponse,
  UsageModelCounters,
  RecordedToolAudit,
} from "@capiro/meri-contracts/conversation-usage";
import type { ConversationReads } from "../../../../shared/meri-conversations/current-reads";
import { StateMessage } from "../../ui/StateMessage";
import { useCurrentRead } from "./useCurrentRead";
import ui from "../../ui/meri-ui.module.css";
import styles from "./evidence.module.css";

function Counters({ value }: { value: UsageModelCounters }) {
  return (
    <dl className={styles.facts}>
      <dt>Input tokens</dt>
      <dd>{value.inputTokens.toLocaleString()}</dd>
      <dt>Output tokens</dt>
      <dd>{value.outputTokens.toLocaleString()}</dd>
      <dt>Cache read input tokens</dt>
      <dd>{value.cacheReadInputTokens.toLocaleString()}</dd>
      <dt>Cache creation input tokens</dt>
      <dd>{value.cacheCreationInputTokens.toLocaleString()}</dd>
      <dt>Web search requests</dt>
      <dd>{value.webSearchRequests.toLocaleString()}</dd>
    </dl>
  );
}

function RecordedHooks({ audit }: { audit: RecordedToolAudit | null }) {
  return (
    <section className={styles.usageSection} aria-label="Recorded tool hooks">
      <h3>Recorded tool hooks</h3>
      {!audit ? (
        <p>Tool hook information is not available in this record.</p>
      ) : (
        <>
          <p>
            Recorded hooks only. {audit.partial ? "Partial record. " : ""}
            {audit.omitted} omitted. Execution outcomes do not confirm external
            effects.
          </p>
          {audit.tools.length ? (
            <ol className={styles.hooks}>
              {audit.tools.map((tool, index) => (
                <li key={index}>
                  <span>{tool.name}</span>
                  <span>
                    {tool.executionOutcome === "completed"
                      ? "Completed"
                      : "Failed"}{" "}
                    ·{" "}
                    {tool.durationMs === null
                      ? "Duration unknown"
                      : `${tool.durationMs.toLocaleString()} ms`}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p>
              No tool hook rows were recorded. This does not establish that no
              tools ran.
            </p>
          )}
        </>
      )}
    </section>
  );
}

function UsageDetails({ value }: { value: ConversationUsageResponse }) {
  const usage = value.usage;
  return (
    <div className={styles.usageContent}>
      {value.recording === "not-recorded" ? (
        <p>
          No usage record is available for this run. This is not a recorded
          zero.
        </p>
      ) : (
        <>
          {usage?.status === "unavailable" && (
            <p>
              Usage is unavailable
              {usage.reason ? `: ${usage.reason.replaceAll("_", " ")}` : ""}.
              Available recorded components are shown below; missing values are
              not zero.
            </p>
          )}
          <section className={styles.usageSection} aria-label="This run">
            <h3>This run</h3>
            {usage?.runDelta ? (
              <>
                <p>
                  Recorded SDK estimate: $
                  {String(usage.runDelta.sdkEstimateUsd)} USD
                </p>
                {usage.runDelta.modelCounters.map((model) => (
                  <section className={styles.model} key={model.model}>
                    <h4>{model.model}</h4>
                    <Counters value={model} />
                  </section>
                ))}
              </>
            ) : (
              <p>Run delta unavailable.</p>
            )}
          </section>
          <section
            className={styles.usageSection}
            aria-label="Cumulative usage"
          >
            <h3>Cumulative usage</h3>
            <p>
              Includes the SDK query pipeline, subagents and compaction, and
              prior resumed or forked usage.
            </p>
            {usage?.cumulative ? (
              <>
                <p>
                  Recorded cumulative SDK estimate: $
                  {String(usage.cumulative.sdkEstimateUsd)} USD
                </p>
                <dl className={styles.facts}>
                  <dt>SDK / CLI</dt>
                  <dd>
                    {usage.cumulative.basis.sdk} / {usage.cumulative.basis.cli}
                  </dd>
                  <dt>Provider basis</dt>
                  <dd>{usage.cumulative.basis.provider}</dd>
                  <dt>Cache write TTL</dt>
                  <dd>{usage.cumulative.basis.cacheWriteTtl}</dd>
                  <dt>Price revision</dt>
                  <dd>{usage.cumulative.basis.priceRevision}</dd>
                </dl>
                {usage.cumulative.models.map((model) => (
                  <section className={styles.model} key={model.model}>
                    <h4>{model.model}</h4>
                    <p>
                      Cumulative SDK estimate: ${String(model.sdkEstimateUsd)}{" "}
                      USD · Provider: {model.provider} · Cost basis:{" "}
                      {model.costBasis}
                    </p>
                    <Counters value={model} />
                  </section>
                ))}
              </>
            ) : (
              <p>Cumulative usage unavailable.</p>
            )}
          </section>
        </>
      )}
      <RecordedHooks audit={value.toolAudit} />
      <p>
        These are recorded SDK estimates, not provider-billed charges. Run usage
        and tool hooks are separate records; they do not show which source or
        answer used a particular tool.
      </p>
    </div>
  );
}

export function RecordedUsageView({
  runId,
  reads,
}: {
  runId: string;
  reads: Pick<ConversationReads, "usage">;
}) {
  const read = useCallback(
    (signal: AbortSignal) => reads.usage(runId, signal),
    [reads, runId],
  );
  const result = useCurrentRead(runId, read);
  if (result.loading)
    return (
      <StateMessage title="Recorded usage" status="Loading" announce>
        <p>Checking the recorded usage for this run.</p>
      </StateMessage>
    );
  if (!result.value)
    return (
      <StateMessage
        title="Recorded usage unavailable"
        status="Unavailable"
        tone="danger"
        announce
        action={
          <button type="button" className={ui.outline} onClick={result.reload}>
            Try again
          </button>
        }
      >
        <p>
          The usage record could not be checked. Missing information does not
          mean zero usage.
        </p>
      </StateMessage>
    );
  return (
    <StateMessage
      title="Recorded usage"
      status={
        result.value.recording === "not-recorded"
          ? "Not recorded"
          : result.value.usage?.status === "unavailable"
            ? "Unavailable"
            : "Recorded"
      }
    >
      <UsageDetails value={result.value} />
    </StateMessage>
  );
}
