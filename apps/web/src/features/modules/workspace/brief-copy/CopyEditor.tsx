"use client";
import { useState } from "react";
import type { BriefCopyDetail } from "@/shared/capiro/operations/workspace-brief-copy";
import { briefCopySaveBodySchema } from "@/shared/capiro/operations/workspace-brief-copy";
import { ActionButton, Field, TextInput } from "@/shared/module-ui";
import type { useBriefCopyCommand } from "./useBriefCopyCommand";
import { CopyBodyEditor } from "./CopyBodyEditor";
import { CopyHistory } from "./CopyHistory";

export function CopyEditor({
  detail,
  command,
}: {
  detail: BriefCopyDetail;
  command: ReturnType<typeof useBriefCopyCommand>;
}) {
  const retained = (command.record ?? command.rebased)?.command;
  const input = retained?.kind === "save" ? retained.body : undefined;
  const [body, setBody] = useState(input?.body ?? detail.document.body);
  const [name, setName] = useState(input?.name ?? detail.document.name);
  const [bodyBlocked, setBodyBlocked] = useState(false);
  const disabled = command.pending || Boolean(command.record);
  const source = detail.document.sourceBriefVersion;
  return (
    <section className="stack">
      <h1>{detail.document.name}</h1>
      <p>
        Independent Workspace copy · Core version {source.versionNumber}. Core
        remains unchanged.
      </p>
      <p>
        Prospect {source.prospectId} · Core brief {source.briefId} · original
        version {source.versionId}
      </p>
      <p>
        Workspace draft {detail.draftId} · tab {detail.document.id}
      </p>
      <CopyHistory draftId={detail.draftId} />
      <Field label="Copied tab name" htmlFor="workspace-copy-name">
        <TextInput
          id="workspace-copy-name"
          value={name}
          maxLength={300}
          disabled={disabled}
          onChange={(event) => {
            if (!disabled) setName(event.target.value);
          }}
        />
      </Field>
      <h2>Copied document content</h2>
      <CopyBodyEditor
        body={body}
        disabled={disabled}
        onChange={setBody}
        onDraftBlocked={setBodyBlocked}
      />
      <ActionButton
        primary
        disabled={disabled || bodyBlocked || !name.trim()}
        onClick={() => {
          if (disabled || bodyBlocked || !name.trim()) return;
          void command.submit({
            source,
            command: {
              kind: "save",
              documentId: detail.document.id,
              body: briefCopySaveBodySchema.parse({
                requestId: crypto.randomUUID(),
                expectedStateHash: command.current.state.stateHash,
                expectedClientId: detail.clientId,
                body,
                name,
                label: "Copied Core brief edit",
              }),
            },
          });
        }}
      >
        Save copied tab
      </ActionButton>
      <details>
        <summary>Original Core source evidence</summary>
        <p>
          This evidence identifies the saved original source. It does not
          certify newly edited text or change when you edit the Workspace copy.
        </p>
        <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
          {JSON.stringify(detail.sourceEvidence, null, 2)}
        </pre>
      </details>
      <details>
        <summary>Fresh current body for comparison</summary>
        <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
          {JSON.stringify(detail.document.body, null, 2)}
        </pre>
      </details>
      <p>
        Edits and history use the atomic copied-tab save. Legacy tab update,
        removal and whole-draft version restore are unavailable for this bound
        copy.
      </p>
    </section>
  );
}
