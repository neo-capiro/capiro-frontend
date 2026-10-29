import type { ConversationStoredRequest } from "@capiro/meri-contracts/conversation-application";
import { skillSelectionLabel } from "./SkillSelectionPicker";

/** Pinned execution facts are shown from admitted input/history, not from the mutable draft picker. */
function AppliedSkillOrRevision({
  request,
  scope,
}: {
  request: ConversationStoredRequest | null | undefined;
  scope: string;
}) {
  if (request?.documentRevision)
    return (
      <details>
        <summary>Applied document revision</summary>
        <p>Scope: {scope}</p>
        <p>Original version: {request.documentRevision.versionId}</p>
        <p>Source bytes are pinned; the original version is retained.</p>
      </details>
    );
  if (!request?.skill) return null;
  const window = request.window;
  return (
    <details>
      <summary>
        Applied skill: {skillSelectionLabel({ skill: request.skill })}
      </summary>
      <p>Scope: {scope}</p>
      {window?.basis === "unbounded" ? (
        <p>All available history</p>
      ) : window && "startInclusive" in window ? (
        <>
          <p>
            Time window: {window.startInclusive} to {window.endExclusive} (end
            exclusive), {window.timezone}
          </p>
          {window.basis === "fiscal-year" && (
            <p>
              Fiscal year {window.year} · {window.stage}
            </p>
          )}
          {"weekStartsOn" in window && window.weekStartsOn && (
            <p>Week starts: {window.weekStartsOn}</p>
          )}
        </>
      ) : (
        <p>No time window was returned.</p>
      )}
    </details>
  );
}

/** A website task can accompany a skill or document revision; show each admitted choice. */
export function SelectedRequestReceipt({
  request,
  scope,
}: {
  request: ConversationStoredRequest | null | undefined;
  scope: string;
}) {
  return (
    <>
      <AppliedSkillOrRevision request={request} scope={scope} />
      {request?.siteWorkflow && (
        <details>
          <summary>
            Applied website task: {request.siteWorkflow.workflowId}
          </summary>
          <p>Website: {request.siteWorkflow.siteId}</p>
          <p>Configuration version: {request.siteWorkflow.version}</p>
          <p>Scope: {scope}</p>
          <p>
            This records the selected task. Website access and actions are
            checked when it runs.
          </p>
        </details>
      )}
    </>
  );
}
