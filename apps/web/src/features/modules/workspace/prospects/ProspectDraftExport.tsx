"use client";
import { useRef, useState } from "react";
import { useCapiro } from "../../../../shared/capiro/CapiroBoundary";
import { ActionButton } from "../../../../shared/module-ui";
import { assertProspectDraft, type ProspectDraftScope } from "./manual-draft";

export function ProspectDraftExport({
  scope,
  disabled,
}: {
  scope: ProspectDraftScope;
  disabled: boolean;
}) {
  const api = useCapiro();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const working = useRef(false);
  async function download(format: "pdf" | "docx") {
    if (working.current || disabled) return;
    working.current = true;
    setPending(true);
    setError("");
    try {
      assertProspectDraft(
        await api.request("workspace.draft", { params: { id: scope.id } }),
        scope,
      );
      const result = await api.download(
        format === "pdf" ? "workspace.draft.pdf" : "workspace.draft.docx",
        { params: { draftId: scope.id } },
      );
      const url = URL.createObjectURL(result.blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = result.filename;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Export unavailable.");
    } finally {
      working.current = false;
      setPending(false);
    }
  }
  return (
    <div>
      <ActionButton
        disabled={disabled || pending}
        onClick={() => void download("pdf")}
      >
        Export saved PDF
      </ActionButton>
      <ActionButton
        disabled={disabled || pending}
        onClick={() => void download("docx")}
      >
        Export saved DOCX
      </ActionButton>
      {error && <p role="alert">{error}</p>}
      <p>
        Exports contain saved content. Sharing, sending and generation remain
        unavailable.
      </p>
    </div>
  );
}
