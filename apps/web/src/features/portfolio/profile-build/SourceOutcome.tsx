import { sources, type JsonValue } from "./contracts";

const taskNames: Record<string, string> = {
  ...sources,
  client_document: "Client document",
  federal_market: "Federal Market",
  facility_resolution: "Facilities",
  district_nexus: "District Nexus",
  advocacy_history: "Advocacy History",
  lifecycle_outcomes: "Lifecycle Outcomes",
  reconciliation: "Reconciliation",
  completion_audit: "Profile Completion",
};
export const sourceName = (source: string) =>
  Object.hasOwn(taskNames, source) ? taskNames[source] : "Unrecognized source";

const statuses = new Set([
  "queued",
  "running",
  "retrying",
  "completed",
  "partial",
  "failed",
  "skipped",
  "cancelled",
]);
const record = (value: JsonValue) =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
const count = (value: JsonValue | undefined): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

// Core's saved source state contains diagnostics alongside these outcome fields.
// Project only the outcome; leave the stored record intact for investigation.
export function SourceOutcome({ value }: { value: JsonValue }) {
  const state = record(value);
  const status =
    typeof state.status === "string" && statuses.has(state.status)
      ? state.status
      : "Status unavailable";
  const counts = [
    ["count", "Saved findings"],
    ["totalTasks", "Tasks"],
    ["completedTasks", "Completed tasks"],
    ["failedTasks", "Failed tasks"],
  ] as const;
  return (
    <div>
      <p>{status}</p>
      {counts.map(([key, label]) =>
        count(state[key]) ? <p key={key}>{`${label}: ${state[key]}`}</p> : null,
      )}
      {(state.error || status === "failed" || status === "partial") && (
        <p>
          This source recorded a problem. Review its status and available
          findings.
        </p>
      )}
    </div>
  );
}

// Only the completion_audit/profile_completion projection uses this view.
// Its warning messages are saved task diagnostics, not authored finding content.
export function ProfileCompletionOutcome({ value }: { value: JsonValue }) {
  if (value === null) return <span className="muted">None</span>;
  const completion = record(value);
  const score = completion.score;
  const warnings = Array.isArray(completion.warnings)
    ? completion.warnings
    : [];
  const calculatedAt =
    typeof completion.calculatedAt === "string" &&
    Number.isFinite(Date.parse(completion.calculatedAt))
      ? new Date(completion.calculatedAt).toISOString()
      : undefined;
  return (
    <div>
      <p>
        {typeof score === "number" && score >= 0 && score <= 100
          ? `Profile completion: ${score}%`
          : "Profile completion score unavailable"}
      </p>
      {(["completed", "missing"] as const).map((key) => {
        const domains = completion[key];
        return Array.isArray(domains) ? (
          <div key={key}>
            <h4>
              {key === "completed" ? "Completed domains" : "Missing domains"}
            </h4>
            {domains.length ? (
              <ul>
                {domains.map((domain, index) => (
                  <li key={index}>
                    {typeof domain === "string" ? domain : "Domain unavailable"}
                  </li>
                ))}
              </ul>
            ) : (
              <p>None recorded</p>
            )}
          </div>
        ) : null;
      })}
      {warnings.length > 0 && (
        <div>
          <h4>Source warnings</h4>
          <ul>
            {warnings.map((warning, index) => {
              const task = record(warning).task;
              return (
                <li key={index}>
                  {typeof task === "string"
                    ? sourceName(task)
                    : "Unrecognized source"}
                  : This task could not complete. Review the task ledger and
                  available findings.
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {calculatedAt && (
        <p>
          Calculated: <time dateTime={calculatedAt}>{calculatedAt}</time>
        </p>
      )}
    </div>
  );
}
