"use client";
import { useRef, useState } from "react";
import type { z } from "zod";
import type { keywordRule } from "../../../../../shared/capiro/operations/legiwatch-keyword-schemas";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  Panel,
  StatusPanel,
} from "../../../../../shared/module-ui";
import { SelectField } from "../components";
import styles from "../legiwatch.module.css";
export function KeywordScanReview({
  rule,
  onChanged,
}: {
  rule: z.infer<typeof keywordRule>;
  onChanged: () => void;
}) {
  const history = useCapiroQuery("legiwatch.keyword.history", {
      params: { id: rule.id },
    }),
    start = useCapiroMutation("legiwatch.keyword.scan.start"),
    advance = useCapiroMutation("legiwatch.keyword.scan.continue"),
    activation = useCapiroMutation("legiwatch.keyword.activation");
  const [selected, setSelected] = useState(""),
    [confirmed, setConfirmed] = useState(false);
  const key = useRef({
    preview: crypto.randomUUID(),
    active: crypto.randomUUID(),
  });
  const run = history.data?.find((item) => item.id === selected),
    pending = start.pending || advance.pending || activation.pending;
  const ready =
    run?.state === "complete" &&
    run.input.mode === "preview" &&
    run.rule_version === rule.version &&
    run.counts.incomplete === 0 &&
    run.counts.evaluated > 0;
  const begin = async (mode: "preview" | "active") => {
    try {
      const result = await start.run({
        params: { id: rule.id },
        body: {
          expectedVersion: rule.version,
          requestKey: key.current[mode],
          mode,
        },
      });
      setSelected(result.id);
      setConfirmed(false);
      key.current[mode] = crypto.randomUUID();
      history.reload();
    } catch {
      /* Retain request identity for uncertain outcomes. */
    }
  };
  const next = async () => {
    try {
      await advance.run({ params: { id: selected } });
      history.reload();
      setConfirmed(false);
    } catch {
      /* Durable checkpoints remain inspectable. */
    }
  };
  const toggle = async (action: "activate" | "pause") => {
    try {
      await activation.run({
        params: { id: rule.id },
        body: {
          expectedVersion: rule.version,
          action,
          baseline: "from_now",
          ...(action === "activate" ? { previewRunId: selected } : {}),
        },
      });
      onChanged();
    } catch {
      /* Changed sources invalidate activation. */
    }
  };
  return (
    <div className={styles.form}>
      <p className={styles.banner}>
        Preview scans have no assignment effects. Active scans follow the saved
        rule&apos;s reviewed mode; automatic additions require backend
        capability and current source qualification.
      </p>
      <div className={styles.actions}>
        <ActionButton disabled={pending} onClick={() => void begin("preview")}>
          Start preview scan
        </ActionButton>
        <ActionButton
          disabled={pending || rule.state !== "active"}
          onClick={() => void begin("active")}
        >
          Start active scan
        </ActionButton>
        <ActionButton disabled={pending} onClick={history.reload}>
          Refresh scan history
        </ActionButton>
      </div>
      <StatusPanel
        loading={history.loading}
        error={history.error}
        onRetry={history.reload}
      >
        <SelectField
          id="keyword-scan"
          label="Saved scan"
          value={selected}
          onChange={(value) => {
            setSelected(value);
            setConfirmed(false);
          }}
        >
          <option value="">Choose a scan</option>
          {history.data?.map((item) => (
            <option key={item.id} value={item.id}>
              {item.input.mode} · {item.state} · Version {item.rule_version} ·{" "}
              {item.id.slice(0, 8)}
            </option>
          ))}
        </SelectField>
      </StatusPanel>
      {run && (
        <Panel title="Scan progress" actions={<Badge>{run.state}</Badge>}>
          <p>
            {run.counts.evaluated} evaluated · {run.counts.matched} matched ·{" "}
            {run.counts.incomplete} incomplete · {run.counts.suggestions}{" "}
            suggestions
          </p>
          {run.reason && <p className={styles.gap}>{run.reason}</p>}
          <ActionButton
            disabled={
              pending ||
              !["pending", "running", "partial", "failed"].includes(
                run.state,
              ) ||
              run.attempts >= 5
            }
            onClick={() => void next()}
          >
            Continue retained-source scan
          </ActionButton>
        </Panel>
      )}
      <label className={styles.check}>
        <input
          type="checkbox"
          checked={confirmed}
          disabled={!ready || pending}
          onChange={(event) => setConfirmed(event.target.checked)}
        />
        Activate from now using this complete preview and the saved{" "}
        {rule.config.mode.replaceAll("_", " ")} policy.
      </label>
      <div className={styles.actions}>
        <ActionButton
          primary
          disabled={!ready || !confirmed || pending}
          onClick={() => void toggle("activate")}
        >
          Activate reviewed rule
        </ActionButton>
        <ActionButton
          disabled={pending || rule.state !== "active"}
          onClick={() => void toggle("pause")}
        >
          Pause matching
        </ActionButton>
      </div>
      {(start.error || advance.error || activation.error) && (
        <p role="alert">
          {(activation.error ?? advance.error ?? start.error)?.message}
        </p>
      )}
    </div>
  );
}
