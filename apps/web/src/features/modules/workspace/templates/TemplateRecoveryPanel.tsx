"use client";
import { ActionButton } from "../../../../shared/module-ui";
import { useTemplateCommands } from "./useTemplateCommands";
import { TemplateProvenance } from "./TemplateProvenance";
import { outreachTemplateOperations as operations } from "../../../../shared/capiro/operations/outreach-templates";
import styles from "../workspace.module.css";

export function TemplateRecoveryPanel({
  onAcknowledged,
}: {
  onAcknowledged: () => void;
}) {
  const commands = useTemplateCommands();
  const record = commands.record;
  const exact =
    record &&
    ["workspace.template.use", "workspace.template.publish"].includes(
      record.command.operation,
    );
  const completed = record?.result !== undefined;
  const useResult =
    completed && record?.command.operation === "workspace.template.use"
      ? operations["workspace.template.use"].response.parse(record.result)
      : undefined;
  const published =
    completed && record?.command.operation === "workspace.template.publish"
      ? operations["workspace.template.publish"].response.parse(record.result)
      : undefined;
  const input =
    record?.command.operation === "save-draft"
      ? record.command.input.metadata
      : record?.command.input;
  const body = input && "body" in input ? input.body : undefined;
  const draft =
    record?.command.operation === "save-draft"
      ? record.command.input.draft.body.spec
      : body && "spec" in body
        ? body.spec
        : undefined;
  if (!record && commands.ready && !commands.error) return null;
  return (
    <section
      className={styles.info}
      aria-label="Template command recovery"
      aria-live="polite"
    >
      <h3>
        {completed
          ? "Template command completed"
          : record?.metadataAcknowledged
            ? "Settings saved; draft is unconfirmed"
            : "Review retained template command"}
      </h3>
      {!commands.ready && <p>Checking current access and retained inputs…</p>}
      {record && (
        <>
          <p>
            {completed
              ? "The completed result is retained until you acknowledge it."
              : "Submitted inputs are saved and frozen. Closing or refreshing this page will not send another command."}
          </p>
          <details>
            <summary>Submitted inputs</summary>
            {body && "name" in body && typeof body.name === "string" && (
              <p>Name: {body.name}</p>
            )}
            {body && "title" in body && typeof body.title === "string" && (
              <p>Campaign title: {body.title || "Template name"}</p>
            )}
            {body && "description" in body && (
              <p>Description: {body.description || "None"}</p>
            )}
            {body && "clientId" in body && (
              <p>
                {body.clientId
                  ? "Original selected client retained"
                  : "No client selected"}
              </p>
            )}
            {body &&
              "variableValues" in body &&
              Object.entries(body.variableValues ?? {}).map(([key, value]) => (
                <p key={key}>
                  {key}: {value}
                </p>
              ))}
            {draft && (
              <>
                <p>Topic: {draft.goal.topic || "Not specified"}</p>
                <p>Goal: {draft.goal.goal || "Not specified"}</p>
                <p>Tone: {draft.strategy.tone || "Not specified"}</p>
              </>
            )}
          </details>
          {useResult && (
            <TemplateProvenance
              sessionId={useResult.sessionId}
              expectedApplicationId={useResult.applicationId}
            />
          )}
          {published && (
            <p>
              Published saved version v{published.version.versionNumber}. Any
              newer draft remains unchanged.
            </p>
          )}
          {!completed && (
            <p>
              {exact
                ? "Recover the original request with its original key and inputs."
                : "This action cannot be replayed safely. Inspect the saved state; do not repeat the write while its outcome is unconfirmed."}
            </p>
          )}
          {commands.inspection && <p>{commands.inspection}</p>}
          {!completed && exact && (
            <ActionButton
              disabled={commands.busy || !commands.ready}
              onClick={() => void commands.recover()}
            >
              Recover original command
            </ActionButton>
          )}
          {!completed && (
            <ActionButton
              disabled={commands.busy || !commands.ready}
              onClick={() => void commands.inspect()}
            >
              Inspect saved state
            </ActionButton>
          )}
          {completed && (
            <ActionButton
              disabled={commands.busy || !commands.ready}
              onClick={async () => {
                if (await commands.acknowledge()) onAcknowledged();
              }}
            >
              Done · refresh library
            </ActionButton>
          )}
        </>
      )}
      {commands.error && (
        <p role="alert" className={styles.error}>
          {commands.error}
        </p>
      )}
      {!commands.ready && (
        <ActionButton onClick={commands.reload}>
          Recheck recovery access
        </ActionButton>
      )}
    </section>
  );
}
